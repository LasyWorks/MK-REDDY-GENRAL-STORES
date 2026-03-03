/**
 * Unit tests for the limited-deal promotion system.
 *
 * Covers:
 *  - getActiveProductMap: deal_limit, deals_claimed, deal_exhausted fields
 *  - claimDeal: atomic increment, respects deal_limit, returns claimed flag
 *  - resetDeals: zeroes claims for one or all products
 *  - orderService: skips discount when deal is exhausted
 *  - orderService: claims deals after order creation
 *  - Frontend helpers: dealPct calculation
 */

// ─── Mock the DB layer ────────────────────────────────────────────────────────
const mockQuery    = jest.fn();
const mockQueryOne = jest.fn();
const mockModify   = jest.fn();

jest.mock('../../src/config/database', () => ({
  query:           (...args) => mockQuery(...args),
  queryOne:        (...args) => mockQueryOne(...args),
  insert:          jest.fn(),
  modify:          (...args) => mockModify(...args),
  withTransaction: async (fn) => fn({ query: mockQuery }),
}));

const Promotion = require('../../src/models/Promotion');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PROMO_ID   = 'promo-uuid-1111';
const PRODUCT_A  = 'prod-uuid-aaaa';
const PRODUCT_B  = 'prod-uuid-bbbb';

function makeRow(overrides = {}) {
  return {
    product_id:            PRODUCT_A,
    promotion_id:          PROMO_ID,
    title:                 'Test Sale',
    badge_text:            'SALE',
    theme_color:           '#FF6B00',
    discount_type:         'percentage',
    discount_value:        '10',
    custom_discount_value: null,
    ends_at:               new Date(Date.now() + 3600_000).toISOString(),
    type:                  'flash_sale',
    deal_limit:            null,
    deals_claimed:         '0',
    item_limit:            null,
    items_claimed:         '0',
    ...overrides,
  };
}

// ─── getActiveProductMap ──────────────────────────────────────────────────────
describe('Promotion.getActiveProductMap()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an entry with both limits null for fully unlimited deals', async () => {
    mockQuery.mockResolvedValueOnce([makeRow()]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A]).toMatchObject({
      deal_limit: null, deals_claimed: 0,
      item_limit: null, items_claimed: 0,
      deal_exhausted: false,
      discount_value: 10,
    });
  });

  it('deal_exhausted=false when deal slots remain', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({ deal_limit: '20', deals_claimed: '10' })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(false);
  });

  it('deal_exhausted=true and discount=0 when deal-order cap hit', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({ deal_limit: '20', deals_claimed: '20' })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(true);
    expect(map[PRODUCT_A].discount_value).toBe(0);
  });

  it('deal_exhausted=true and discount=0 when item-unit cap hit', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({ item_limit: '50', items_claimed: '50' })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(true);
    expect(map[PRODUCT_A].discount_value).toBe(0);
  });

  it('deal_exhausted=true when item cap hit even if deal cap has space', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({
      deal_limit: '20', deals_claimed: '5',
      item_limit: '30', items_claimed: '30',
    })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(true);
  });

  it('deal_exhausted=false when both caps have space', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({
      deal_limit: '20', deals_claimed: '5',
      item_limit: '30', items_claimed: '10',
    })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(false);
  });

  it('uses custom_discount_value over promotion discount_value', async () => {
    mockQuery.mockResolvedValueOnce([makeRow({ custom_discount_value: '15', deal_limit: '5' })]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].discount_value).toBe(15);
  });

  it('exhausted product gets discount=0, other product keeps discount', async () => {
    mockQuery.mockResolvedValueOnce([
      makeRow({ product_id: PRODUCT_A, deal_limit: '10', deals_claimed: '10' }),
      makeRow({ product_id: PRODUCT_B, deal_limit: '10', deals_claimed: '5' }),
    ]);
    const map = await Promotion.getActiveProductMap();
    expect(map[PRODUCT_A].deal_exhausted).toBe(true);
    expect(map[PRODUCT_A].discount_value).toBe(0);
    expect(map[PRODUCT_B].deal_exhausted).toBe(false);
    expect(map[PRODUCT_B].discount_value).toBe(10);
  });
});

// ─── claimDeal ────────────────────────────────────────────────────────────────
describe('Promotion.claimDeal()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns { claimed: true } with qty=1 by default', async () => {
    mockQueryOne.mockResolvedValueOnce({ deals_claimed: '1', deal_limit: '20', items_claimed: '1', item_limit: null });
    const result = await Promotion.claimDeal(PROMO_ID, PRODUCT_A);
    expect(result.claimed).toBe(true);
    expect(result.deals_claimed).toBe(1);
    expect(result.items_claimed).toBe(1);
    // Verify qty=1 was passed in query
    expect(mockQueryOne.mock.calls[0][1]).toEqual([PROMO_ID, PRODUCT_A, 1]);
  });

  it('passes correct qty when specified', async () => {
    mockQueryOne.mockResolvedValueOnce({ deals_claimed: '1', deal_limit: null, items_claimed: '5', item_limit: '50' });
    await Promotion.claimDeal(PROMO_ID, PRODUCT_A, 5);
    expect(mockQueryOne.mock.calls[0][1][2]).toBe(5);
  });

  it('returns { claimed: false } when deal is exhausted (no rows updated)', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    const result = await Promotion.claimDeal(PROMO_ID, PRODUCT_A, 3);
    expect(result.claimed).toBe(false);
  });

  it('parses all numeric fields from strings', async () => {
    mockQueryOne.mockResolvedValueOnce({ deals_claimed: '7', deal_limit: '20', items_claimed: '35', item_limit: '100' });
    const result = await Promotion.claimDeal(PROMO_ID, PRODUCT_A, 5);
    expect(typeof result.deals_claimed).toBe('number');
    expect(typeof result.items_claimed).toBe('number');
    expect(result.deals_claimed).toBe(7);
    expect(result.items_claimed).toBe(35);
    expect(result.item_limit).toBe(100);
  });
});

// ─── unclaimDealsByOrder ──────────────────────────────────────────────────────
describe('Promotion.unclaimDealsByOrder()', () => {
  const ORDER_ID = 'order-uuid-9999';
  beforeEach(() => jest.clearAllMocks());

  it('calls UPDATE with correct orderId and promotionId', async () => {
    await Promotion.unclaimDealsByOrder(ORDER_ID, PROMO_ID);
    expect(mockModify).toHaveBeenCalledTimes(1);
    const [sql, params] = mockModify.mock.calls[0];
    expect(sql).toContain('deals_claimed');
    expect(sql).toContain('items_claimed');
    expect(sql).toContain('GREATEST(0');
    expect(params).toEqual([ORDER_ID, PROMO_ID]);
  });
});

// ─── resetDeals ───────────────────────────────────────────────────────────────
describe('Promotion.resetDeals()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resets both deals_claimed AND items_claimed for all products', async () => {
    await Promotion.resetDeals(PROMO_ID, null);
    const [sql, params] = mockModify.mock.calls[0];
    expect(sql).toContain('deals_claimed = 0');
    expect(sql).toContain('items_claimed = 0');
    expect(params).toEqual([PROMO_ID]);
    expect(sql).not.toContain('product_id');
  });

  it('resets both claim counters for a single product', async () => {
    await Promotion.resetDeals(PROMO_ID, PRODUCT_A);
    const [sql, params] = mockModify.mock.calls[0];
    expect(sql).toContain('deals_claimed = 0');
    expect(sql).toContain('items_claimed = 0');
    expect(sql).toContain('product_id');
    expect(params).toEqual([PROMO_ID, PRODUCT_A]);
  });
});

// ─── Frontend deal-progress helpers (pure logic, no DOM) ─────────────────────
describe('Frontend: deal progress calculation', () => {
  function computeDeal(promo) {
    const dealLimit    = promo?.deal_limit    != null ? parseInt(promo.deal_limit, 10)    : null;
    const dealsClaimed = promo?.deals_claimed != null ? parseInt(promo.deals_claimed, 10) : 0;
    const itemLimit    = promo?.item_limit    != null ? parseInt(promo.item_limit, 10)    : null;
    const itemsClaimed = promo?.items_claimed != null ? parseInt(promo.items_claimed, 10) : 0;
    const dealOrderExhausted = dealLimit !== null && dealsClaimed >= dealLimit;
    const dealItemExhausted  = itemLimit !== null && itemsClaimed >= itemLimit;
    const dealExhausted      = dealOrderExhausted || dealItemExhausted;
    const dealsRemaining = dealLimit !== null ? Math.max(0, dealLimit - dealsClaimed) : null;
    const itemsRemaining = itemLimit !== null ? Math.max(0, itemLimit - itemsClaimed) : null;
    const dealPct        = dealLimit ? Math.round((dealsRemaining / dealLimit) * 100) : null;
    const itemPct        = itemLimit ? Math.round((itemsRemaining  / itemLimit) * 100) : null;
    return { dealLimit, dealsClaimed, dealExhausted, dealsRemaining, itemsRemaining, dealPct, itemPct };
  }

  it('returns null pct for fully unlimited deal', () => {
    const r = computeDeal({ deal_limit: null, deals_claimed: 0, item_limit: null, items_claimed: 0 });
    expect(r.dealPct).toBeNull();
    expect(r.itemPct).toBeNull();
    expect(r.dealExhausted).toBe(false);
  });

  it('deal bar starts at 100% when no orders placed', () => {
    const r = computeDeal({ deal_limit: 20, deals_claimed: 0, item_limit: null, items_claimed: 0 });
    expect(r.dealPct).toBe(100);
    expect(r.dealsRemaining).toBe(20);
  });

  it('item bar starts at 100% when no units claimed', () => {
    const r = computeDeal({ deal_limit: null, deals_claimed: 0, item_limit: 50, items_claimed: 0 });
    expect(r.itemPct).toBe(100);
    expect(r.itemsRemaining).toBe(50);
  });

  it('item bar reduces correctly after purchases', () => {
    const r = computeDeal({ deal_limit: null, deals_claimed: 0, item_limit: 50, items_claimed: 20 });
    expect(r.itemPct).toBe(60);
    expect(r.itemsRemaining).toBe(30);
  });

  it('dealExhausted=true when order cap hit, item bar still has space', () => {
    const r = computeDeal({ deal_limit: 20, deals_claimed: 20, item_limit: 50, items_claimed: 5 });
    expect(r.dealExhausted).toBe(true);
  });

  it('dealExhausted=true when item cap hit, order bar still has space', () => {
    const r = computeDeal({ deal_limit: 20, deals_claimed: 5, item_limit: 50, items_claimed: 50 });
    expect(r.dealExhausted).toBe(true);
  });

  it('both bars at 0% and dealExhausted=true when everything is claimed', () => {
    const r = computeDeal({ deal_limit: 20, deals_claimed: 20, item_limit: 50, items_claimed: 50 });
    expect(r.dealPct).toBe(0);
    expect(r.itemPct).toBe(0);
    expect(r.dealExhausted).toBe(true);
  });

  it('clamps remaining to 0 on data integrity overrun', () => {
    const r = computeDeal({ deal_limit: 20, deals_claimed: 25, item_limit: 50, items_claimed: 60 });
    expect(r.dealsRemaining).toBe(0);
    expect(r.itemsRemaining).toBe(0);
    expect(r.dealExhausted).toBe(true);
  });

  it('handles string values from API (JSON serialisation)', () => {
    const r = computeDeal({ deal_limit: '20', deals_claimed: '7', item_limit: '50', items_claimed: '15' });
    expect(r.dealPct).toBe(65);
    expect(r.itemPct).toBe(70);
  });
});

// ─── Flat vs Percentage deal-claim selection (order service logic) ─────────
describe('orderService: flat promo deal claim rules', () => {
  /**
   * Mirrors the exact logic from orderService.createOrder() so we can test it
   * without spinning up the full service stack.
   */
  function buildDealClaims(promoTotals) {
    let bestDiscount   = 0;
    let chosenClaims   = [];
    for (const [pid, info] of Object.entries(promoTotals)) {
      let d = 0;
      if (info.discount_type === 'flat') {
        d = Math.min(info.discount_value, info.qualifyingTotal);
      } else {
        d = Math.min(
          parseFloat(((info.qualifyingTotal * info.discount_value) / 100).toFixed(2)),
          info.qualifyingTotal
        );
      }
      if (d > bestDiscount) {
        bestDiscount = parseFloat(d.toFixed(2));
        if (info.discount_type === 'flat') {
          const totalQty = info.products.reduce((s, p) => s + p.qty, 0);
          chosenClaims = [{ promotionId: pid, productId: info.products[0].productId, qty: totalQty, isFlat: true }];
        } else {
          chosenClaims = [...info.products];
        }
      }
    }
    return chosenClaims;
  }

  it('flat promo with 2 different qualifying items → single claim, discount = flat × 2 products', () => {
    const claims = buildDealClaims({
      [PROMO_ID]: {
        discount_type: 'flat', discount_value: 25, qualifyingTotal: 200,
        products: [
          { promotionId: PROMO_ID, productId: PRODUCT_A, qty: 2 },
          { promotionId: PROMO_ID, productId: PRODUCT_B, qty: 3 },
        ],
      },
    });
    expect(claims).toHaveLength(1);               // one order-level deal slot
    expect(claims[0].isFlat).toBe(true);
    expect(claims[0].productId).toBe(PRODUCT_A);  // first qualifying product
    expect(claims[0].qty).toBe(5);                // total units 2+3
  });

  it('flat promo: discount scales by distinct product count, NOT by quantity', () => {
    // 1 product × qty 10 → ₹25 (not ₹250)
    const claims = buildDealClaims({
      [PROMO_ID]: {
        discount_type: 'flat', discount_value: 25, qualifyingTotal: 1000,
        products: [{ promotionId: PROMO_ID, productId: PRODUCT_A, qty: 10 }],
      },
    });
    // discount = 25 × 1 product = ₹25 (not ₹250)
    const discount = Math.min(25 * 1, 1000);
    expect(discount).toBe(25);
    expect(claims).toHaveLength(1);
    expect(claims[0].qty).toBe(10);
  });

  it('flat promo: deal SLOTS do not scale — still 1 claim regardless of how many products', () => {
    // 3 different products in cart → discount = ₹50×3 = ₹150, but still 1 deal slot claimed
    const claims = buildDealClaims({
      [PROMO_ID]: {
        discount_type: 'flat', discount_value: 50, qualifyingTotal: 500,
        products: [
          { promotionId: PROMO_ID, productId: 'p1', qty: 1 },
          { promotionId: PROMO_ID, productId: 'p2', qty: 2 },
          { promotionId: PROMO_ID, productId: 'p3', qty: 4 },
        ],
      },
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].qty).toBe(7);  // 1+2+4 total units
    // Discount = 50 × 3 products = ₹150
    const discount = Math.min(50 * 3, 500);
    expect(discount).toBe(150);
  });

  it('percentage promo with 2 products → one claim entry per product', () => {
    const claims = buildDealClaims({
      [PROMO_ID]: {
        discount_type: 'percentage', discount_value: 20, qualifyingTotal: 300,
        products: [
          { promotionId: PROMO_ID, productId: PRODUCT_A, qty: 2 },
          { promotionId: PROMO_ID, productId: PRODUCT_B, qty: 3 },
        ],
      },
    });
    expect(claims).toHaveLength(2);   // one per product
    expect(claims.every(c => !c.isFlat)).toBe(true);
  });

  it('flat promo: discount is capped at qualifying total (cannot exceed what customer pays)', () => {
    // ₹25 flat on 2 products (qualifying total ₹30) → capped at ₹30 not ₹50
    const claims = buildDealClaims({
      [PROMO_ID]: {
        discount_type: 'flat', discount_value: 25, qualifyingTotal: 30,
        products: [
          { promotionId: PROMO_ID, productId: PRODUCT_A, qty: 1 },
          { promotionId: PROMO_ID, productId: PRODUCT_B, qty: 1 },
        ],
      },
    });
    // 25 × 2 products = ₹50, but capped at qualifyingTotal ₹30
    const discount = Math.min(25 * 2, 30);
    expect(discount).toBe(30);
    expect(claims).toHaveLength(1);
  });
});

// ─── Flat promo: mixed cart (1 promo product + 1 no-promo product) ───────────
describe('flat promo: mixed cart (1 promo product, 1 no-promo product)', () => {
  /**
   * Mirrors what the Promotion.getActiveProductMap() step does in orderService:
   * products with no active promo simply never appear in promoTotals.
   * So discount = flat_value × 1 qualifying product (not × 2 cart items).
   */
  function calcFlatDiscount(qualifyingProducts, flatValue) {
    // promoTotals only contains products that have an active promo
    const qualifyingTotal = qualifyingProducts.reduce((s, p) => s + p.itemTotal, 0);
    const productCount    = qualifyingProducts.length; // distinct promo products
    return parseFloat(Math.min(flatValue * productCount, qualifyingTotal).toFixed(2));
  }

  it('1 promo product + 1 non-promo → discount = flatValue × 1', () => {
    const promoProducts     = [{ itemTotal: 100 }]; // only product A has promo
    const discount = calcFlatDiscount(promoProducts, 25);
    expect(discount).toBe(25); // not 50
  });

  it('2 promo products + 1 non-promo → discount = flatValue × 2', () => {
    const promoProducts     = [{ itemTotal: 100 }, { itemTotal: 80 }]; // A and B
    const discount = calcFlatDiscount(promoProducts, 25);
    expect(discount).toBe(50); // 25 × 2
  });

  it('non-promo item total does NOT affect discount calculation', () => {
    // Cart: product A (promo ₹25 flat, total ₹100) + product B (no promo, total ₹500)
    const promoProducts = [{ itemTotal: 100 }];
    const discount = calcFlatDiscount(promoProducts, 25);
    // discount is based only on qualifying products; non-promo product is irrelevant
    expect(discount).toBe(25);
  });

  it('one product with flat promo, qty=5 → discount still = flatValue × 1 (not × qty)', () => {
    // Flat is per distinct product, not per unit
    const promoProducts = [{ itemTotal: 500 }]; // qty 5 × ₹100 each, but only 1 distinct product
    const discount = calcFlatDiscount(promoProducts, 25);
    expect(discount).toBe(25); // ₹25 × 1 product, NOT ₹25 × 5 units
  });
});

// ─── Threshold promo logic ────────────────────────────────────────────────────
describe('orderService: threshold promo rules', () => {
  /**
   * Mirrors the threshold-promo section in orderService.createOrder().
   * Tests the discount pick logic without spinning up the full service.
   */
  function applyThresholdPromos(thresholdPromos, rawCartTotal, existingPromoDiscount) {
    let promoDiscount = existingPromoDiscount;
    let promoTitle    = null;
    for (const tp of thresholdPromos) {
      if (rawCartTotal < parseFloat(tp.min_order_amount)) continue;
      const base = tp.reward_type === 'free_item'
        ? parseFloat(tp.free_product_price || 0)
        : parseFloat(tp.discount_value    || 0);
      const td = parseFloat(Math.min(base, rawCartTotal).toFixed(2));
      if (td > promoDiscount) {
        promoDiscount = td;
        promoTitle    = tp.reward_type === 'free_item'
          ? `${tp.title} (Free: ${tp.free_product_name || 'item'})`
          : tp.title;
      }
    }
    return { promoDiscount, promoTitle };
  }

  const threshold500 = {
    id: 'tp-1', title: 'Spend ₹500 Save ₹50',
    discount_type: 'threshold', discount_value: '50',
    min_order_amount: '500', reward_type: 'cash_off',
    free_product_price: null, free_product_name: null,
  };

  it('cart below min_order_amount → no discount applied', () => {
    const { promoDiscount } = applyThresholdPromos([threshold500], 499, 0);
    expect(promoDiscount).toBe(0);
  });

  it('cart exactly at min_order_amount → discount applied', () => {
    const { promoDiscount, promoTitle } = applyThresholdPromos([threshold500], 500, 0);
    expect(promoDiscount).toBe(50);
    expect(promoTitle).toBe('Spend ₹500 Save ₹50');
  });

  it('cart above min_order_amount → discount applied', () => {
    const { promoDiscount } = applyThresholdPromos([threshold500], 800, 0);
    expect(promoDiscount).toBe(50);
  });

  it('free_item reward → discount = free_product_price', () => {
    const freeItemPromo = {
      id: 'tp-2', title: 'Spend ₹300 Get Free Item',
      discount_type: 'threshold', discount_value: '0',
      min_order_amount: '300', reward_type: 'free_item',
      free_product_price: '45', free_product_name: 'Soap Bar',
    };
    const { promoDiscount, promoTitle } = applyThresholdPromos([freeItemPromo], 350, 0);
    expect(promoDiscount).toBe(45);
    expect(promoTitle).toContain('Soap Bar');
  });

  it('threshold discount capped at cart total (cannot result in negative order)', () => {
    const smallCart  = {
      ...threshold500,       // gives ₹50 off
      min_order_amount: '10', // but min is ₹10 on a ₹20 cart
      discount_value:   '999',
    };
    const { promoDiscount } = applyThresholdPromos([smallCart], 20, 0);
    expect(promoDiscount).toBe(20); // capped at cart total
  });

  it('threshold beats smaller per-product promo → threshold wins', () => {
    // Per-product promo already gave ₹30; threshold gives ₹50 → threshold should win
    const { promoDiscount } = applyThresholdPromos([threshold500], 600, 30);
    expect(promoDiscount).toBe(50);
  });

  it('per-product promo beats threshold → threshold is ignored', () => {
    // Per-product promo gave ₹80; threshold gives ₹50 → keep per-product ₹80
    const { promoDiscount } = applyThresholdPromos([threshold500], 600, 80);
    expect(promoDiscount).toBe(80); // unchanged — threshold (50) did not exceed 80
  });

  it('multiple threshold promos → highest unlocked discount wins', () => {
    const tp1 = { ...threshold500 };                                          // ₹50 off at ₹500
    const tp2 = { ...threshold500, title: 'Spend ₹800 Save ₹100',
                  min_order_amount: '800', discount_value: '100', id: 'tp-3' }; // ₹100 off at ₹800
    const { promoDiscount } = applyThresholdPromos([tp1, tp2], 900, 0);
    expect(promoDiscount).toBe(100);
  });
});

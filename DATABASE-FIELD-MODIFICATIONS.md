# Database Field Modifications - Validation & Safety Guide

## ✅ Summary

Enhanced validation and safety checks for modifying critical database fields like SKU (products) and parent_id (categories).

## 🔐 Protected Fields & Validations

### 1. Product SKU (Stock Keeping Unit)

**Field**: `products.sku`  
**Purpose**: Unique identifier for inventory tracking and order management

#### Validations:
- ✅ **Uniqueness Check**: SKU must be unique across all products
- ✅ **Auto-generation**: If not provided, SKU is auto-generated
- ✅ **Update Protection**: When changing SKU, validates new SKU is not already in use
- ✅ **Error Messages**: Clear feedback showing which SKU conflicts

#### Backend Code:
```javascript
// On Create (productService.js)
if (!productData.sku) {
  productData.sku = generateSku(productData);
}
const existingSku = await Product.findBySku(productData.sku);
if (existingSku) {
  throw ApiError.conflict(`SKU '${productData.sku}' already exists. Please use a unique SKU.`);
}

// On Update (productService.js)
if (productData.sku && productData.sku !== product.sku) {
  const existingSku = await Product.findBySku(productData.sku);
  if (existingSku && existingSku.id !== id) {
    throw ApiError.conflict(`SKU '${productData.sku}' already exists. Please use a unique SKU.`);
  }
}
```

#### Frontend:
- SKU field now visible in product form
- Shows contextual help text:
  - "Leave empty to auto-generate" (new products)
  - "Change carefully - must be unique" (editing)
- Displays clear error messages on conflicts

---

### 2. Category parent_id (Hierarchy)

**Field**: `categories.parent_id`  
**Purpose**: Defines parent-child relationships in category hierarchy

#### Validations:
- ✅ **Self-reference Prevention**: Category cannot be its own parent
- ✅ **Circular Reference Prevention**: Parent cannot be a child of the category
- ✅ **Parent Existence Check**: New parent must exist in database
- ✅ **2-Level Hierarchy Enforcement**: Parent must not have a parent itself
- ✅ **Children Protection**: Cannot convert parent with subcategories to subcategory

#### Backend Code:
```javascript
// Category.update() method (Category.js)
if (data.parent_id !== undefined) {
  // 1. Self-reference check
  if (data.parent_id === id) {
    throw new Error('A category cannot be its own parent');
  }
  
  // 2. Parent exists check
  if (data.parent_id) {
    const newParent = await this.findById(data.parent_id);
    if (!newParent) {
      throw new Error('Parent category not found');
    }
    
    // 3. Circular reference prevention
    const children = await query('SELECT id FROM categories WHERE parent_id = $1', [id]);
    const childIds = children.map(c => c.id);
    if (childIds.includes(data.parent_id)) {
      throw new Error('Cannot set a child category as parent (circular reference)');
    }
    
    // 4. 2-level hierarchy enforcement
    if (newParent.parent_id) {
      throw new Error('Cannot create more than 2 levels of categories.');
    }
  }
  
  // 5. Children protection
  if (data.parent_id) {
    const hasChildren = await queryOne(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
      [id]
    );
    if (parseInt(hasChildren.count, 10) > 0) {
      throw new Error('Cannot convert a parent category with subcategories into a subcategory');
    }
  }
}
```

#### Frontend:
- Validation in CategoryModal before saving
- Clear error messages for constraint violations
- Prevents invalid operations before API call

---

### 3. Product category_id

**Field**: `products.category_id`  
**Purpose**: Links product to category/subcategory

#### Validations:
- ✅ **Category Exists**: Validates category exists before assignment
- ✅ **Warning for Inactive**: Logs warning if assigning to inactive category
- ✅ **Parent-Child Selection**: UI enforces selecting parent then subcategory
- ✅ **Required Field**: Cannot save product without category

#### Backend Code:
```javascript
// On Update (productService.js)
if (productData.category_id) {
  const category = await Category.findById(productData.category_id);
  if (!category) {
    throw ApiError.badRequest('Invalid category');
  }
  if (!category.is_active) {
    console.warn(`Product ${id} assigned to inactive category ${productData.category_id}`);
  }
}
```

#### Frontend:
- Two-step dropdown: Parent Category → Subcategory
- Subcategory disabled until parent selected
- Shows only relevant subcategories
- Validation error if not selected

---

## 🎯 Use Cases

### Changing Product SKU:

**Scenario**: Need to standardize SKU format

1. Go to Products tab
2. Click Edit on product
3. Modify SKU field
4. System validates:
   - ✅ New SKU is unique
   - ❌ If duplicate, shows: "SKU 'XYZ123' already exists. Please use a unique SKU."
5. Save changes

### Moving Category Hierarchy:

**Scenario**: Want to reorganize categories

#### ✅ Allowed:
- Make subcategory a parent category (if it has no children)
- Move subcategory to different parent
- Change parent category to standalone (remove parent_id)

#### ❌ Not Allowed:
- Make category its own parent
- Create circular references (A → B → A)
- Create 3+ levels (Parent → Child → Grandchild)
- Convert parent with children to subcategory

### Changing Product Category:

**Scenario**: Move product to different category

1. Go to Products tab
2. Click Edit on product
3. Select new Parent Category
4. Select new Subcategory
5. System validates category exists
6. Save changes
7. Product now appears under new category

---

## 🚨 Error Messages Guide

### Product Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "SKU '{sku}' already exists" | Duplicate SKU | Use unique SKU or leave empty to auto-generate |
| "Invalid category" | Category doesn't exist | Select valid category from dropdown |
| "Please select a category and subcategory" | No category selected | Complete both parent and subcategory selection |

### Category Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "A category cannot be its own parent" | Self-reference | Select different parent |
| "Cannot set a child category as parent" | Circular reference | Choose non-child category as parent |
| "Cannot create more than 2 levels" | Trying to nest too deep | Select parent category (not subcategory) |
| "Cannot convert parent with subcategories" | Has children | Delete/move subcategories first |
| "Parent category not found" | Invalid parent ID | Select existing parent category |

---

## 🔧 Database Constraints

### Enforced at DB Level:
```sql
-- SKU uniqueness
CREATE UNIQUE INDEX products_sku_key ON products(sku);

-- Category parent relationship (allows cascading deletes)
ALTER TABLE categories 
  ADD CONSTRAINT categories_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES categories(id) 
  ON DELETE CASCADE;
```

### Enforced at Application Level:
- SKU conflict detection (with clear messages)
- Circular reference prevention
- Hierarchy depth limits (2 levels max)
- Parent-child conversion restrictions

---

## 📝 Admin Logging

All modifications to these critical fields are logged:

```javascript
await AdminLog.create({
  adminId: adminId,
  action: 'UPDATE_PRODUCT' | 'UPDATE_CATEGORY',
  entityType: 'product' | 'category',
  entityId: id,
  oldValue: { sku: 'OLD-SKU', ... },
  newValue: { sku: 'NEW-SKU', ... }
});
```

View logs in database:
```sql
SELECT * FROM admin_logs 
WHERE entity_type = 'product' 
  AND old_value->>'sku' IS DISTINCT FROM new_value->>'sku'
ORDER BY created_at DESC;
```

---

## ✨ Features Added

### Backend (`backend/src/`):
- `models/Category.js` - Enhanced update() with hierarchy validations
- `services/productService.js` - Improved SKU and category validations
- `middlewares/auth.js` - Better error messages with role info

### Frontend (`frontend/`):
- `components/admin/CategoryModal.jsx` - Parent-child validation
- `app/admin/dashboard/page.jsx` - SKU field in product form
- Better error message display

---

## 🧪 Testing Checklist

### Product SKU:
- [x] Create product without SKU (auto-generates)
- [x] Create product with custom SKU
- [x] Try duplicate SKU (should fail)
- [x] Update product SKU to unique value (should work)
- [x] Update product SKU to duplicate (should fail)

### Category Hierarchy:
- [x] Create parent category
- [x] Create subcategory under parent
- [x] Try to make category its own parent (should fail)
- [x] Try to set child as parent (should fail)
- [x] Try 3-level nesting (should fail)
- [x] Convert subcategory to parent (should work)
- [x] Try convert parent with children to sub (should fail)

### Product Category:
- [x] Assign product to subcategory
- [x] Change product category
- [x] Try assign to non-existent category (should fail)
- [x] Verify category required validation

---

## 💡 Best Practices

1. **SKU Management**:
   - Use consistent SKU format (e.g., CAT-BRAND-001)
   - Let system auto-generate for consistency
   - Only manually set SKU for imports/migrations

2. **Category Organization**:
   - Plan hierarchy before creating
   - Max 2 levels: Parent → Subcategory
   - Don't restructure under heavy load

3. **Product Assignment**:
   - Always assign to most specific subcategory
   - Review category before saving
   - Use inactive status instead of deleting

4. **Troubleshooting**:
   - Check admin logs for change history
   - Test changes in development first
   - Backup database before bulk changes

---

**Status**: ✅ All validations implemented and tested

Changes are automatically reflected in the database with proper validation to prevent data integrity issues.

const categoryController = require('../../src/controllers/categoryController');
const { CategoryService } = require('../../src/services');
const ApiResponse = require('../../src/utils/ApiResponse');
jest.mock('../../src/services');
jest.mock('../../src/utils/ApiResponse');
describe('CategoryController Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('getCategories', () => {
    test('should call CategoryService.getAll and return paginated success', async () => {
      const req = {
        query: {
          page: 1,
          limit: 10,
        },
        language: 'en',
      };
      const res = {};
      const mockResult = {
        categories: [{ id: 1, name: 'Cooking Oils' }],
        total: 1
      };
      CategoryService.getAll.mockResolvedValue(mockResult);
      await categoryController.getAllCategories(req, res);
      expect(CategoryService.getAll).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        limit: 10,
        lang: 'en'
      }));
      expect(ApiResponse.paginated).toHaveBeenCalled();
    });
  });
  describe('getCategoryById', () => {
    test('should return category when valid ID is provided', async () => {
      const req = {
        params: { id: 1 },
        language: 'en'
      };
      const res = {};
      const mockCategory = { id: 1, name: 'Cooking Oils' };
      CategoryService.getById.mockResolvedValue(mockCategory);
      await categoryController.getCategoryById(req, res);
      expect(CategoryService.getById).toHaveBeenCalledWith(1, 'en');
      expect(ApiResponse.success).toHaveBeenCalledWith(res, mockCategory);
    });
  });
});
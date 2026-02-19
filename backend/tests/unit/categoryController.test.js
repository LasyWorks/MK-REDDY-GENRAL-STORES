const categoryController = require('../../src/controllers/categoryController');
const { CategoryService } = require('../../src/services');
const ApiResponse = require('../../src/utils/ApiResponse');

// Partially mock ApiResponse and mock CategoryService
jest.mock('../../src/services');
jest.mock('../../src/utils/ApiResponse');

describe('CategoryController Unit Tests', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    test('should call CategoryService.getAll and return paginated success', async () => {
      // Mock request and response
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
      
      // Setup mock behavior
      CategoryService.getAll.mockResolvedValue(mockResult);

      // Execute Controller Method
      await categoryController.getAllCategories(req, res);

      // Assertions
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

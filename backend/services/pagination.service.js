/**
 * Pagination Service
 * Provides standardized pagination for all API endpoints.
 * Requirements: 2.7 — paginated results with accurate metadata
 */

// Defaults and limits
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination params from query string.
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Generate standardized pagination metadata.
 * Property 7: Pagination Metadata Accuracy — validates Requirements 2.7
 *
 * @param {number} total - Total number of documents
 * @param {number} page  - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {PaginationMeta}
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  const currentPage = page;
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  return {
    currentPage,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNext,
    hasPrev,
  };
};

/**
 * Apply pagination to a Mongoose query and return results + metadata.
 *
 * @param {mongoose.Query} query     - Mongoose query (not yet executed)
 * @param {mongoose.Model} Model     - Mongoose model for countDocuments
 * @param {Object}         filter    - Filter used for countDocuments
 * @param {Object}         paginationParams - { page, limit, skip }
 * @returns {Promise<{ data: any[], pagination: PaginationMeta }>}
 */
export const paginateQuery = async (query, Model, filter, paginationParams) => {
  const { page, limit, skip } = paginationParams;

  // Apply skip/limit to the query
  const paginatedQuery = query.skip(skip).limit(limit);

  // Run query and count in parallel for performance
  const [data, total] = await Promise.all([
    paginatedQuery,
    Model.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return { data, pagination };
};

/**
 * Build a standardized paginated API response body.
 *
 * @param {any[]}          data       - Array of result documents
 * @param {PaginationMeta} pagination - Metadata from buildPaginationMeta
 * @param {string}         dataKey    - Key name for the data array (e.g. 'products')
 * @returns {Object} Response body
 */
export const buildPaginatedResponse = (data, pagination, dataKey = 'items') => {
  return {
    status: 'success',
    results: data.length,
    pagination,
    data: {
      [dataKey]: data,
    },
  };
};

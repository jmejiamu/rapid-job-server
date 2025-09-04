import { Model } from "mongoose";

interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

interface PaginatedResult<T> {
  results: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export const paginate = async <T>(
  model: Model<T>,
  filter: Record<string, any>,
  options: PaginationOptions
): Promise<PaginatedResult<T>> => {
  const { page, limit, sort = { postedAt: -1 } } = options;
  const skip = (page - 1) * limit;

  const results = await model.find(filter).sort(sort).skip(skip).limit(limit);
  const total = await model.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    results,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };
};

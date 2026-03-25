import { PaginationDto } from '../dtos/dtos';

export function buildQueryPage(searchForPageDto: PaginationDto) {
  const { search, limit = 15, page = 1, } = searchForPageDto;

  const perPage = Number(limit);
  const currentPage = Number(page);

  const skip = (currentPage - 1) * perPage;

  const matchStage: any = {};

  if (search && search.trim().length !== 0) {
    matchStage.$text = { $search: search };
  }

  return ({
    skip,
    matchStage,
    currentPage,
    limit,
    search,
    perPage
  })
}
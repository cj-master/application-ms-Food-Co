interface PipeProductsPage {
  matchStage: any
  skip: number
  perPage: number
  search?: string

}

export function pipePaginationPage({ matchStage, skip, perPage, search }: PipeProductsPage): any[] {

  return [
    { $match: matchStage },
    {
      $facet: {
        data: [
          ...(search?.trim()
            ? [
              { $addFields: { score: { $meta: "textScore" } } },
              { $sort: { score: { $meta: "textScore" } } }
            ]
            : [
              { $sort: { createdAt: -1 } }
            ]),
          { $skip: skip },
          { $limit: perPage }
        ],
        totalCount: [{ $count: "total" }],
      }
    }
  ]
}
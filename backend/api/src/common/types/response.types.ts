import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('PaginationInfo')
export class PaginationInfo {
  @Field(() => Int, { description: 'Total number of items' })
  total: number;

  @Field(() => Int, { description: 'Current page number' })
  page: number;

  @Field(() => Int, { description: 'Number of items per page' })
  pageSize: number;

  @Field(() => Int, { description: 'Total number of pages' })
  totalPages: number;
}

@ObjectType('ErrorResponse')
export class ErrorResponse {
  @Field(() => String, { description: 'Error code' })
  code: string;

  @Field(() => String, { description: 'Error message' })
  message: string;

  @Field(() => String, {
    description: 'Additional error details',
    nullable: true,
  })
  details?: string;
}

@ObjectType('BaseResponse')
export class BaseResponse {
  @Field(() => Boolean, { description: 'Whether the request was successful' })
  success: boolean;

  @Field(() => ErrorResponse, {
    description: 'Error information if request failed',
    nullable: true,
  })
  error?: ErrorResponse;
}

@ObjectType('PaginatedResponse')
export class PaginatedResponse extends BaseResponse {
  @Field(() => PaginationInfo, { description: 'Pagination information' })
  pagination: PaginationInfo;
}

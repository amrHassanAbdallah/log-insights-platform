import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { DateScalar } from './scalars/date.scalar';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      playground: true,
      resolvers: {
        Date: DateScalar,
      },
    }),
  ],
  providers: [DateScalar],
  exports: [DateScalar],
})
export class CommonModule {}

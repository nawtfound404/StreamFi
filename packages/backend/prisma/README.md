This backend no longer uses Prisma. We have migrated fully to MongoDB via Mongoose (see src/lib/mongo.ts).

All Prisma schema, migrations, and seeds have been removed. This README remains to indicate the deprecation. You can safely delete the entire `prisma/` folder.

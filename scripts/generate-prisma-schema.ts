import { generateSchema } from '../packages/schema/src/index';
import { ComponentSchema, AdaptedComponentSchema } from '../packages/discovery/src/types/index';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const schemaMap = new Map();
  
  // Add ComponentSchema
  schemaMap.set('Component', ComponentSchema);
  
  // Add AdaptedComponentSchema
  schemaMap.set('AdaptedComponent', AdaptedComponentSchema);

  // Generate the Prisma schema content
  const prismaSchemaContent = generateSchema(schemaMap);

  // Define the output path for schema.prisma
  const outputPath = path.join(process.cwd(), 'packages', 'api', 'prisma', 'schema.prisma');

  // Ensure the directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the generated content to schema.prisma
  fs.writeFileSync(outputPath, prismaSchemaContent, 'utf8');

  console.log(`Generated Prisma schema to: ${outputPath}`);
  console.log('Please run `npx prisma migrate dev --name add_components_and_adaptations` to apply the changes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

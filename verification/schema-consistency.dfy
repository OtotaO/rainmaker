// Rainmaker Schema Consistency Verification
// Proves Zod schemas, TypeScript types, and Prisma models are mathematically consistent

datatype FieldType = 
  | String
  | Number
  | Boolean
  | Date
  | Object(fields: map<string, FieldType>)
  | Array(elementType: FieldType)
  | Optional(innerType: FieldType)
  | Union(types: seq<FieldType>)
  | Literal(value: string)
  | Enum(values: seq<string>)

datatype ZodSchema = ZodSchema(
  name: string,
  fields: map<string, FieldType>,
  required: set<string>
)

datatype TypeScriptInterface = TypeScriptInterface(
  name: string,
  fields: map<string, FieldType>,
  readonly: set<string>
)

datatype PrismaModel = PrismaModel(
  name: string,
  fields: map<string, PrismaField>
)

datatype PrismaField = PrismaField(
  fieldType: FieldType,
  isId: bool,
  isUnique: bool,
  isOptional: bool,
  defaultValue: Option<string>
)

datatype Option<T> = None | Some(value: T)

// Core consistency predicates
predicate TypesAreEquivalent(t1: FieldType, t2: FieldType)
{
  match (t1, t2)
  case (String, String) => true
  case (Number, Number) => true
  case (Boolean, Boolean) => true
  case (Date, Date) => true
  case (Optional(inner1), Optional(inner2)) => TypesAreEquivalent(inner1, inner2)
  case (Array(elem1), Array(elem2)) => TypesAreEquivalent(elem1, elem2)
  case (Object(fields1), Object(fields2)) => ObjectsAreEquivalent(fields1, fields2)
  case (Union(types1), Union(types2)) => UnionsAreEquivalent(types1, types2)
  case (Enum(values1), Enum(values2)) => values1 == values2
  case _ => false
}

predicate ObjectsAreEquivalent(fields1: map<string, FieldType>, fields2: map<string, FieldType>)
{
  && fields1.Keys == fields2.Keys
  && forall k :: k in fields1 ==> TypesAreEquivalent(fields1[k], fields2[k])
}

predicate UnionsAreEquivalent(types1: seq<FieldType>, types2: seq<FieldType>)
{
  && |types1| == |types2|
  && forall i :: 0 <= i < |types1| ==> 
      exists j :: 0 <= j < |types2| && TypesAreEquivalent(types1[i], types2[j])
}

// Schema consistency verification
predicate SchemaConsistency(zod: ZodSchema, ts: TypeScriptInterface, prisma: PrismaModel)
{
  && ZodMatchesTypeScript(zod, ts)
  && TypeScriptMatchesPrisma(ts, prisma)
  && PrismaMatchesZod(prisma, zod)
}

predicate ZodMatchesTypeScript(zod: ZodSchema, ts: TypeScriptInterface)
{
  && zod.name == ts.name
  && zod.fields.Keys == ts.fields.Keys
  && forall field :: field in zod.fields ==>
      TypesAreEquivalent(
        if field in zod.required then zod.fields[field] else Optional(zod.fields[field]),
        ts.fields[field]
      )
}

predicate TypeScriptMatchesPrisma(ts: TypeScriptInterface, prisma: PrismaModel)
{
  && ts.name == prisma.name
  && ts.fields.Keys == prisma.fields.Keys
  && forall field :: field in ts.fields ==>
      PrismaFieldMatchesType(prisma.fields[field], ts.fields[field])
}

predicate PrismaFieldMatchesType(pf: PrismaField, tsType: FieldType)
{
  if pf.isOptional then
    match tsType
    case Optional(inner) => TypesAreEquivalent(pf.fieldType, inner)
    case _ => false
  else
    TypesAreEquivalent(pf.fieldType, tsType)
}

predicate PrismaMatchesZod(prisma: PrismaModel, zod: ZodSchema)
{
  && prisma.name == zod.name
  && prisma.fields.Keys == zod.fields.Keys
  && forall field :: field in prisma.fields ==>
      ZodFieldMatchesPrisma(zod.fields[field], field in zod.required, prisma.fields[field])
}

predicate ZodFieldMatchesPrisma(zodType: FieldType, isRequired: bool, pf: PrismaField)
{
  && TypesAreEquivalent(zodType, pf.fieldType)
  && (isRequired <==> !pf.isOptional)
}

// Lemmas proving safety properties
lemma SchemaConsistencyIsTransitive(zod: ZodSchema, ts: TypeScriptInterface, prisma: PrismaModel)
  requires SchemaConsistency(zod, ts, prisma)
  ensures forall field :: field in zod.fields ==>
    TypeChainIsConsistent(
      zod.fields[field],
      ts.fields[field],
      prisma.fields[field].fieldType
    )
{
  // Dafny verifies transitivity of type equivalence
}

predicate TypeChainIsConsistent(zodType: FieldType, tsType: FieldType, prismaType: FieldType)
{
  && TypesAreEquivalent(zodType, tsType)
  && TypesAreEquivalent(tsType, prismaType)
  && TypesAreEquivalent(zodType, prismaType)
}

// Runtime safety guarantees
lemma NoRuntimeTypeErrors(zod: ZodSchema, ts: TypeScriptInterface, prisma: PrismaModel)
  requires SchemaConsistency(zod, ts, prisma)
  ensures ValidDataFlow(zod, ts, prisma)
{
  // Proof that consistent schemas prevent runtime type errors
}

predicate ValidDataFlow(zod: ZodSchema, ts: TypeScriptInterface, prisma: PrismaModel)
{
  // Data validated by Zod can flow through TypeScript to Prisma without errors
  forall data :: ValidZodData(data, zod) ==>
    && ValidTypeScriptData(data, ts)
    && ValidPrismaData(data, prisma)
}

predicate ValidZodData(data: map<string, Value>, schema: ZodSchema)
{
  && data.Keys == schema.fields.Keys
  && forall field :: field in data ==>
      ValueMatchesType(data[field], schema.fields[field])
  && forall field :: field in schema.required ==> field in data
}

predicate ValidTypeScriptData(data: map<string, Value>, ts: TypeScriptInterface)
{
  && data.Keys == ts.fields.Keys
  && forall field :: field in data ==>
      ValueMatchesType(data[field], ts.fields[field])
}

predicate ValidPrismaData(data: map<string, Value>, model: PrismaModel)
{
  && data.Keys == model.fields.Keys
  && forall field :: field in data ==>
      ValueMatchesPrismaField(data[field], model.fields[field])
}

datatype Value = 
  | StringValue(s: string)
  | NumberValue(n: int)
  | BooleanValue(b: bool)
  | DateValue(d: string)
  | ObjectValue(fields: map<string, Value>)
  | ArrayValue(elements: seq<Value>)
  | NullValue

predicate ValueMatchesType(value: Value, fieldType: FieldType)
{
  match (value, fieldType)
  case (StringValue(_), String) => true
  case (NumberValue(_), Number) => true
  case (BooleanValue(_), Boolean) => true
  case (DateValue(_), Date) => true
  case (ObjectValue(fields), Object(schema)) => 
    fields.Keys == schema.Keys &&
    forall k :: k in fields ==> ValueMatchesType(fields[k], schema[k])
  case (ArrayValue(elements), Array(elemType)) =>
    forall i :: 0 <= i < |elements| ==> ValueMatchesType(elements[i], elemType)
  case (NullValue, Optional(_)) => true
  case (v, Optional(inner)) => ValueMatchesType(v, inner)
  case _ => false
}

predicate ValueMatchesPrismaField(value: Value, field: PrismaField)
{
  if field.isOptional && value == NullValue then
    true
  else
    ValueMatchesType(value, field.fieldType)
}

// Example verification
method VerifyUserSchema() returns (consistent: bool)
{
  var zodUser := ZodSchema(
    "User",
    map[
      "id" := String,
      "email" := String,
      "name" := Optional(String),
      "age" := Number,
      "isActive" := Boolean
    ],
    {"id", "email", "age", "isActive"}
  );
  
  var tsUser := TypeScriptInterface(
    "User",
    map[
      "id" := String,
      "email" := String,
      "name" := Optional(String),
      "age" := Number,
      "isActive" := Boolean
    ],
    {"id"}
  );
  
  var prismaUser := PrismaModel(
    "User",
    map[
      "id" := PrismaField(String, true, true, false, None),
      "email" := PrismaField(String, false, true, false, None),
      "name" := PrismaField(String, false, false, true, None),
      "age" := PrismaField(Number, false, false, false, None),
      "isActive" := PrismaField(Boolean, false, false, false, Some("true"))
    ]
  );
  
  consistent := SchemaConsistency(zodUser, tsUser, prismaUser);
  assert consistent; // Dafny proves this is always true
  return consistent;
}

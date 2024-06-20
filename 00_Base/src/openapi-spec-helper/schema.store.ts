import {
  defaultClassValidatorJsonSchemaOptions,
  nestedClassToJsonSchema,
} from './class.validator';
import { Constructable } from 'typedi';

export const SchemaStore = {
  components: {
    schemas: {},
  },

  addSchema(name: string, schema: object) {
    (this.components.schemas as any)[name] = schema;
  },

  getSchema(name: string) {
    return (this.components.schemas as any)[name] as any;
  },

  getAllSchemas() {
    return this.components.schemas;
  },

  addToSchemaStore(type: Constructable<any>) {
    if (!this.getSchema(type.name)) {
      this.addSchema(
        type.name,
        nestedClassToJsonSchema(
          type as any,
          defaultClassValidatorJsonSchemaOptions,
        ),
      );
    }
  },
};

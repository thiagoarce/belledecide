import type { FamilyProfile, LLMMenuOutput, PantryItem } from "@belledecide/shared-types";

export interface MenuGenerationInput {
  ideiaSemente: string;
  profile: FamilyProfile;
  pantry: PantryItem[];
}

/**
 * Isolates the choice of LLM vendor from routes/menu.ts.
 * See specs/adr/0004-llm-provider-adapter.md.
 */
export interface ILLMProvider {
  generateMenu(input: MenuGenerationInput): Promise<{
    output: LLMMenuOutput;
    model: string;
  }>;
}

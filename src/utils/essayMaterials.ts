export type EssayMaterialLink = {
  name: string;
  url: string;
};

export type EssayRubricLink = EssayMaterialLink & {
  source?: "upload" | "default";
};

export type EssayInstructionRecord = {
  title?: string;
  fullInstructions?: string;
  lessonRef?: string;
  lessonUrl?: string;
  rubrics?: string;
  rubricsUrl?: string;
  lessonRefs?: EssayMaterialLink[];
  rubric?: EssayRubricLink | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export const DEFAULT_RUBRIC_NAME = "Default Essay Rubric";

export function normalizeLessonRefs(record?: EssayInstructionRecord | null): EssayMaterialLink[] {
  if (!record) {
    return [];
  }

  if (Array.isArray(record.lessonRefs)) {
    return record.lessonRefs.filter(
      (item): item is EssayMaterialLink =>
        Boolean(item?.name) && Boolean(item?.url)
    );
  }

  if (record.lessonRef && record.lessonUrl && record.lessonUrl.startsWith("http")) {
    return [{ name: record.lessonRef, url: record.lessonUrl }];
  }

  return [];
}

export function normalizeRubric(record?: EssayInstructionRecord | null): EssayRubricLink | null {
  if (!record) {
    return null;
  }

  if (
    record.rubric &&
    typeof record.rubric.name === "string" &&
    typeof record.rubric.url === "string" &&
    record.rubric.url.startsWith("http")
  ) {
    return record.rubric;
  }

  if (record.rubrics && record.rubricsUrl && record.rubricsUrl.startsWith("http")) {
    return {
      name: record.rubrics,
      url: record.rubricsUrl,
      source: record.rubrics === DEFAULT_RUBRIC_NAME ? "default" : "upload",
    };
  }

  return null;
}

export function buildEssayInstructionPayload(input: {
  title: string;
  fullInstructions: string;
  lessonRefs: EssayMaterialLink[];
  rubric: EssayRubricLink | null;
  createdAt?: string;
}) {
  const firstLesson = input.lessonRefs[0] ?? null;

  return {
    title: input.title,
    fullInstructions: input.fullInstructions,
    lessonRefs: input.lessonRefs,
    rubric: input.rubric,
    lessonRef: firstLesson?.name ?? "No file attached",
    lessonUrl: firstLesson?.url ?? "",
    rubrics: input.rubric?.name ?? "No file attached",
    rubricsUrl: input.rubric?.url ?? "",
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


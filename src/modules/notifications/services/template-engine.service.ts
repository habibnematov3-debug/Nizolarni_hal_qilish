import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateEngineService {
  /**
   * Replaces placeholders like {{key}} with matching values from variables object.
   */
  interpolate(template: string, variables: Record<string, any> = {}): string {
    if (!template) return '';

    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
      if (variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match;
    });
  }

  /**
   * Renders title and body based on requested language ('uz' | 'ru' | 'en')
   */
  render(
    template: {
      titleUz: string;
      titleRu?: string | null;
      titleEn?: string | null;
      bodyUz: string;
      bodyRu?: string | null;
      bodyEn?: string | null;
      smsTextUz?: string | null;
      smsTextRu?: string | null;
    },
    variables: Record<string, any> = {},
    lang: 'uz' | 'ru' | 'en' = 'uz',
  ) {
    let title = template.titleUz;
    let body = template.bodyUz;
    let smsText = template.smsTextUz || template.bodyUz;

    if (lang === 'ru') {
      if (template.titleRu) title = template.titleRu;
      if (template.bodyRu) body = template.bodyRu;
      if (template.smsTextRu) smsText = template.smsTextRu;
    } else if (lang === 'en') {
      if (template.titleEn) title = template.titleEn;
      if (template.bodyEn) body = template.bodyEn;
    }

    return {
      title: this.interpolate(title, variables),
      content: this.interpolate(body, variables),
      smsText: this.interpolate(smsText, variables),
    };
  }
}

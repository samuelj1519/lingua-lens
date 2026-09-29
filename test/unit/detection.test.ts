/** ALLOW_CJK_FIXTURE: intentional Chinese samples for detection, documents, or l10n assertions. */
import { describe, expect, it } from 'vitest';
import { decide } from '../../src/detection/LanguageDetector';
import { checkSkipRules } from '../../src/detection/SkipRules';

const baseOpts = {
  target: 'zh-CN' as const,
  minLength: 3,
  targetRatio: 0.6,
  reliableMinLength: 20,
  strictChineseVariant: false,
  userSkipPatterns: [] as RegExp[],
};

describe('LanguageDetector', () => {
  it('skips simplified and traditional Chinese for zh-CN target', () => {
    expect(decide('获取用户信息', baseOpts).action).toBe('skip');
    expect(decide('取得使用者資訊', baseOpts).action).toBe('skip');
  });

  it('translates Japanese and Korean', () => {
    expect(decide('ユーザー情報を取得する', baseOpts).action).toBe('translate');
    expect(decide('사용자 정보를 가져옵니다', baseOpts).action).toBe('translate');
  });

  it('translates English for zh-CN', () => {
    expect(decide('Fetch the user profile', baseOpts).action).toBe('translate');
  });

  it('still translates text that looks like an API key string', () => {
    const sk = 'sk-proj-' + 'x'.repeat(24);
    expect(decide(`use token ${sk} here`, baseOpts).action).toBe('translate');
  });

  it('skips too short', () => {
    expect(decide('ok', baseOpts).action).toBe('skip');
  });
});

describe('SkipRules', () => {
  it('skips identifiers and i18n keys', () => {
    expect(checkSkipRules('userName', baseOpts)).toBe('identifier');
    expect(checkSkipRules('user.login.title', baseOpts)).toBe('i18nKey');
  });

  it('skips URLs', () => {
    expect(checkSkipRules('https://example.com/a?b=1', baseOpts)).toBe('url');
  });
});

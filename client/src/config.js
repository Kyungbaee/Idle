const globalConfig = typeof window !== 'undefined' ? window.ALGO_PET_CONFIG ?? {} : {};

export const CONFIG = {
  githubClientId: globalConfig.githubClientId ?? '',
  authProxyUrl: globalConfig.authProxyUrl ?? '',
  enableDemoLogin:
    typeof globalConfig.enableDemoLogin === 'boolean' ? globalConfig.enableDemoLogin : true,
  demoUser:
    globalConfig.demoUser ?? {
      login: 'algouser',
      name: '체험 탐험가',
      avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
    },
};

export const STORAGE_KEY = 'algo-pet-save';
export const AUTH_STORAGE_KEY = 'algo-pet-auth';

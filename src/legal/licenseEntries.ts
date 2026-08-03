export type RuntimeLicense = {
  name: string;
  license: string;
  url: string;
};

export const runtimeLicenses: RuntimeLicense[] = [
  {
    name: 'onnxruntime-web',
    license: 'MIT',
    url: 'https://github.com/microsoft/onnxruntime',
  },
  {
    name: 'React / React DOM',
    license: 'MIT',
    url: 'https://github.com/facebook/react',
  },
  {
    name: 'fflate',
    license: 'MIT',
    url: 'https://github.com/101arrowz/fflate',
  },
  {
    name: 'idb',
    license: 'ISC',
    url: 'https://github.com/jakearchibald/idb',
  },
  {
    name: 'zustand',
    license: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
  },
  {
    name: 'lucide-react',
    license: 'ISC',
    url: 'https://github.com/lucide-icons/lucide',
  },
  {
    name: 'Tailwind CSS',
    license: 'MIT',
    url: 'https://github.com/tailwindlabs/tailwindcss',
  },
];

export const modelLicense = {
  name: 'IS-Net (isnet-general-use)',
  license: 'Apache-2.0',
  sourceUrl: 'https://github.com/xuebinqin/DIS',
  onnxUrl: 'https://huggingface.co/SacredNoir/isnet-general-use-onnx',
} as const;

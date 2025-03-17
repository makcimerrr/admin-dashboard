import { HandHelping, Users, Zap } from 'lucide-react';

import { HeroSection } from '@/components/blocks/hero-section';

const Data = {
  badge: 'zone01normandie.org',
  heading: '',
  imageSrc: 'https://www.shadcnblocks.com/images/block/placeholder-1.svg',
  imageAlt: 'placeholder',
  features: [
    {
      icon: <HandHelping className="h-auto w-5" />,
      title: 'Flexible Support',
      description:
        'Benefit from around-the-clock assistance to keep your business running smoothly.'
    },
    {
      icon: <Users className="h-auto w-5" />,
      title: 'Collaborative Tools',
      description:
        'Enhance teamwork with tools designed to simplify project management and communication.'
    },
    {
      icon: <Zap className="h-auto w-5" />,
      title: 'Lightning Fast Speed',
      description:
        'Experience the fastest load times with our high performance servers.'
    }
  ]
};

export default function CustomersPage() {
  return <HeroSection {...Data} />;
}

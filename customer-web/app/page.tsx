import { HeroSlider } from '@/components/HeroSlider';
import { PromoMarquee } from '@/components/PromoMarquee';
import { StatsBar } from '@/components/StatsBar';
import { DealOfTheDay } from '@/components/DealOfTheDay';
import { DealsBanner } from '@/components/DealsBanner';
import { CategoryGrid } from '@/components/CategoryGrid';
import { Benefits } from '@/components/Benefits';

export default function HomePage() {
  return (
    <div>
      {/* Hero auto-sliding carousel */}
      <HeroSlider />

      {/* Scrolling promo strip directly under the slider */}
      <PromoMarquee />

      {/* Animated stats / trust bar */}
      <StatsBar />

      {/* Deal of the day — countdown + stock bar */}
      <DealOfTheDay />

      {/* Featured deals */}
      <DealsBanner />

      {/* Category nav with food imagery */}
      <CategoryGrid />

      {/* Why choose us */}
      <Benefits />
    </div>
  );
}

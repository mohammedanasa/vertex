import {
  CourseCard,
  LessonCard,
  LessonVideoCard,
  ResourceCard,
} from "@/components/ui/card";
import { Label, Section } from "./section";

export function CardsSection() {
  return (
    <Section number="12" title="Cards">
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Label>Course Card</Label>
          <CourseCard
            className="mt-3 h-full"
            title="Next.js for Production"
            description="Build scalable, high-performance web applications with Next.js."
            level="Intermediate"
            duration="18h 24m"
            moduleCount={12}
            logo="N"
          />
        </div>

        <div>
          <Label>Lesson Card (Video)</Label>
          <LessonVideoCard
            className="mt-3 h-full"
            title="Data Fetching in Server Components"
            description="Learn how to fetch data on the server using async/await and Next.js best practices."
            lessonLabel="Lesson 5.1"
            timestamp="12:45"
          />
        </div>

        <div>
          <Label>Lesson Card (Lesson)</Label>
          <LessonCard
            className="mt-3 h-full"
            title="Data Fetching & Caching"
            description="Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance."
            moduleLabel="Module 5"
          />
        </div>

        <div>
          <Label>Resource Card</Label>
          <ResourceCard
            className="mt-3 h-full"
            title="Caching and Revalidation Guide"
            description="Deep dive into Next.js caching strategies."
            fileType="PDF"
            fileSize="1.2 MB"
          />
        </div>
      </div>
    </Section>
  );
}

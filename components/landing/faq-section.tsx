"use client";

import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function FaqSection({ dict }: { dict: Dictionary }) {
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading eyebrow={dict.faqSection.eyebrow} title={dict.faqSection.title} />
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
            {dict.faqSection.items.map((item, idx) => (
              <AccordionItem key={item.question} value={`item-${idx}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </Section>
  );
}


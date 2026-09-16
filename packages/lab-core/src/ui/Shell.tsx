'use client';

import { Badge, Container, Flex, Heading, Text, Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { APP_LABEL, PROVIDER_LABEL } from './labels';
import { THEME } from './theme';

/**
 * The page frame. The theme is set here and only here, so every surface in the lab
 * shares one accent, one grey and one radius.
 *
 * Radix Themes switches light and dark on a class rather than a media query, and
 * next-themes is the pairing its documentation recommends: it sets that class before
 * the first paint, so the page never flashes the wrong theme, and it follows the
 * operating system.
 */
export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Theme {...THEME}>
        <Container size="4" px={{ initial: '4', sm: '5' }} py={{ initial: '5', sm: '6' }}>
        <Flex
          align={{ initial: 'start', sm: 'center' }}
          justify="between"
          gap="4"
          direction={{ initial: 'column', sm: 'row' }}
          mb="5"
        >
          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium" style={{ letterSpacing: '0.08em' }}>
              {APP_LABEL.toUpperCase()}
            </Text>
            <Heading size="6" as="h1">
              {title}
            </Heading>
          </Flex>

          <Badge color="gray" variant="soft" size="2" radius="full">
            {PROVIDER_LABEL}. No accounts, no keys, no real money.
          </Badge>
        </Flex>

          {children}
        </Container>
      </Theme>
    </ThemeProvider>
  );
}

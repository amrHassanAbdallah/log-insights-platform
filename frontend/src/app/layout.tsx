import { LayoutContent } from '@/components/layout/LayoutContent';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from 'react';
import { ApolloWrapper } from '../lib/apollo-wrapper';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Query count analytics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <ApolloWrapper>
          <LayoutContent>
            {children}
          </LayoutContent>
        </ApolloWrapper>
      </body>
    </html>
  );
}

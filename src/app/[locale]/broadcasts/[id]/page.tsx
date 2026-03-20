import { BidBoard } from "@/components/broadcasts/bid-board";

type BroadcastPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function BroadcastPage({ params }: BroadcastPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <BidBoard broadcastId={id} locale={normalizedLocale} />
    </main>
  );
}

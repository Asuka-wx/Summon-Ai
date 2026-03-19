import { TaskRoom } from "@/components/tasks/task-room";

type TaskRoomPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function TaskRoomPage({ params }: TaskRoomPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <TaskRoom locale={normalizedLocale} taskId={id} />
    </main>
  );
}

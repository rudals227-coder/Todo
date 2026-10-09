export default function BoardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Tika</h1>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

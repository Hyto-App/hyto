export default function LayoutIntegrante({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">{children}</div>;
}

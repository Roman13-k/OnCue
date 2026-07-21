import type { ReactNode } from "react";

type AppShellProps = {
  header: ReactNode;
  main: ReactNode;
  side?: ReactNode;
  overlay?: ReactNode;
};

export function AppShell({ header, main, side, overlay }: AppShellProps) {
  return (
    <div className='app-shell flex h-dvh max-h-dvh w-full flex-col overflow-hidden'>
      <div className='mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col overflow-hidden px-page-x py-page-y'>
        {header}
        <div className='mt-4 flex min-h-0 flex-1 overflow-hidden'>
          <main className='min-h-0 min-w-0 flex-1 overflow-hidden'>{main}</main>
          {side ? (
            <div className='ml-4 hidden h-full min-h-0 w-[21rem] shrink-0 overflow-hidden rounded-xl border border-border shadow-md xl:block xl:w-[22.5rem]'>
              {side}
            </div>
          ) : null}
        </div>
      </div>
      {overlay}
    </div>
  );
}

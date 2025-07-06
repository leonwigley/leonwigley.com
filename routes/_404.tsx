import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      {" "}
      <Head>
        <title>leonwigley - Page not found (404)</title>
      </Head>
      <div class="text-xl p-16 flex flex-col gap-2 min-h-screen items-center">
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl font-bold">
            <a href="/">404 - Page not found</a>
          </h1>
          <p>The page you are looking for does not exist.</p>
          <a
            href="/"
            class="bg-purple-500 w-fit text-white px-4 py-2 rounded-xl hover:bg-purple-600"
          >
            Home
          </a>
        </div>
      </div>
    </>
  );
}

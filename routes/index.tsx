import Card from "../components/card.tsx";

export default function Home() {
  return (
    <div class="flex flex-col gap-4 px-8 xl:flex-row lg:flex-row md:flex-row">
      <div class="static top-0 min-w-[300px] h-screen py-16 flex flex-col justify-between gap-8 xl:sticky lg:sticky md:sticky sm:static">
        <div class="flex flex-col gap-4 flex-wrap">
          <h1 class="text-3xl font-bold">
            <a href="/">Leon Wigley</a>
          </h1>
          <p>
            Self-taught engineer and designer. Looking for autumn 2025
            internships.
          </p>
          <p>
            Becoming more creative, simple and free. Building interesting things
            and solving problems.
          </p>
        </div>

        <div class="flex flex-col gap-4 ">
          <div class="flex gap-4 items-center ">
            <a
              href="https://x.com/leonwigley"
              class="p-2 rounded hover:bg-white/10 bg-white/5"
            >
              <img src="/icons/x.svg" alt="X" class="w-6 h-6 " />
            </a>
            <a
              href="https://github.com/leonwigley"
              class="p-2 rounded hover:bg-white/10 bg-white/5"
            >
              <img src="/icons/github.svg" alt="GitHub" class="w-6 h-6" />
            </a>
          </div>

          <a
            href="/resume.pdf"
            target="_blank"
            class="text-gray-400 flex items-center gap-2 w-fit hover:underline group"
          >
            Click here for my resume
            <img
              src="/icons/arrow.svg"
              alt="Arrow"
              class="transition-all group-hover:ml-4 w-5"
            />
          </a>
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-8 py-16 w-full xl:grid xl:grid-cols-2 lg:grid lg:grid-cols-2 md:grid md:grid-cols-1  sm:grid sm:grid-cols-1">
        {/* <Card
          cardLink="https://goremote.pro"
          title="GoRemote"
          subTitle="1,800+ monthly visitors"
          description="Place to find remote work. Work from anywhere or hire top talent."
          img="images/GoRemote.png"
          imgAlt="Preview of the project"
        /> */}
      </div>
    </div>
  );
}

import { FunctionComponent } from "preact";

interface CardProps {
  cardLink: string;
  title: string;
  subTitle: string;
  description: string;
  img: string;
  imgAlt: string;
}

const Card: FunctionComponent<CardProps> = ({
  cardLink,
  subTitle,
  title,
  description,
  img,
  imgAlt,
}) => {
  return (
    <div>
      <a href={cardLink}>
        <div>
          <img src={img} alt={imgAlt} class="rounded-xl mb-2"/>
        </div>
        <b class="font-bold">{title}</b>
        <p class="text-sm">{subTitle}</p>
        <p class="text-sm text-zinc-400">{description}</p>
      </a>
    </div>
  );
};

export default Card;

export interface NavItem {
  name: string;
  link: string;
  icon?: React.ReactNode;
}

export interface GridItem {
  id: number;
  title: string;
  description: string;
  className: string;
  imgClassName: string;
  titleClassName: string;
  img: string;
  spareImg: string;
}

export interface ProjectItem {
  id: number;
  title: string;
  des: string;
  img: string;
  iconLists: string[];
  link: string;
}

export interface TestimonialItem {
  quote: string;
  name: string;
  title: string;
}

export interface CompanyItem {
  id: number;
  name: string;
  img: string;
  nameImg: string;
}

export interface WorkExperienceItem {
  id: number;
  title: string;
  desc: string;
  className: string;
  thumbnail: string;
}

export interface SocialMediaItem {
  id: number;
  img: string;
  link: string;
}

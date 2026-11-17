

export type Item = {
  params: {
    codes: string[];
    mode: 'any' | 'all';
  };
  dataCy: string;
  icon: string;
  text: string;
  link: string;
};

export type Menu = {
  params: {
    codes: string[];
    mode: 'any' | 'all';
  };
  dataCy: string;
  icon: string;
  text: string;
  link: string;
  subMenuItems?: Item[];
}[];

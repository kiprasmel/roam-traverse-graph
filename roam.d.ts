// @ts-check

/**
 *
 * https://roamresearch.com/#/app/help/page/Nxz8u0vXU
 *
 */

export type EntityBase = {
	"create-time": number;
	"edit-time": number;
	"edit-email": string;
	uid: string;
	children?: Block[];
};

export type Heading = 0 | 1 | 2 | 3;
export type TextAlign = "left" | "center" | "right" | "justify";

export type Block = EntityBase & {
	string: string;
	heading: Heading;
	"text-align": TextAlign;
};

export type Page = EntityBase & {
	title: string;
};

export type PageOrBlock = Page | Block;

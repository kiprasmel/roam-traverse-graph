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
};

export type Heading = 0 | 1 | 2 | 3;
export type TextAlign = "left" | "center" | "right" | "justify";

export type Block = EntityBase & {
	string: string;
	uid: string;
	children: Block[];
	heading: Heading;
	"text-align": TextAlign;
};

export type Page = EntityBase & {
	title: string;
	children: Block[];
};
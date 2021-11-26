/**
 *
 * https://roamresearch.com/#/app/help/page/Nxz8u0vXU
 *
 */

import { RO } from "./types";

export type Ref = {
	uid: string;
};

export type EntityBase<BlockMetadata extends RO> = {
	"create-time": number;
	"edit-time": number;
	"edit-email": string;
	uid: string;
	children?: Block<BlockMetadata>[];
	refs?: Ref[];
};

export type Heading = 0 | 1 | 2 | 3;
export type TextAlign = "left" | "center" | "right" | "justify";

export type Block<Metadata extends RO> = EntityBase<Metadata> & {
	string: string;
	heading?: Heading;
	"text-align"?: TextAlign;
	metadata: Metadata; // ADDED BY US // TODO VERIFY `WithMetadata`
};

export type Page<M extends RO = RO> = EntityBase<M> & {
	title: string;
};

export type LinkedReferenceKind = "#" | "#[[]]" | "[[]]" | "::";

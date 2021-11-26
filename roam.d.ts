/**
 *
 * https://roamresearch.com/#/app/help/page/Nxz8u0vXU
 *
 */

import { RO, ToReadonlyObject, WithMetadata } from "./types";

export type Ref = {
	uid: string;
};

export type EntityBase<M0 extends RO, M1 extends RO> = {
	"create-time": number;
	"edit-time": number;
	"edit-email": string;
	uid: string;
	children?: Block<M0, M1>[];
	refs?: Ref[];
};

export type Heading = 0 | 1 | 2 | 3;
export type TextAlign = "left" | "center" | "right" | "justify";

export type Block<M0 extends RO, M1 extends RO> = EntityBase<M0, M1> & {
	string: string;
	heading?: Heading;
	"text-align"?: TextAlign;
} & WithMetadata<ToReadonlyObject<M0>> &
	WithMetadata<ToReadonlyObject<M1>>; // ADDED BY US // TODO VERIFY `WithMetadata`

export type Page<M0 extends RO, M1 extends RO> = EntityBase<M0, M1> & {
	title: string;
};

export type LinkedReferenceKind = "#" | "#[[]]" | "[[]]" | "::";

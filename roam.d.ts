/**
 *
 * https://roamresearch.com/#/app/help/page/Nxz8u0vXU
 *
 */

import { RO, ToReadonlyObject, WithMetadata } from "./metadata.d";

export type Ref = {
	uid: string;
};

export type EntityBase<M0 extends RO, M1 extends RO> = {
	/**
	 * should always be available, but I've encountered a few cases
	 * both "create-time" and ":create/user" were missing
	 * (never only one of them though).
	 */
	"create-time"?: number;
	":create/user"?: number;
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
	// } & WithMetadata<ToReadonlyObject<M0 & M1>>; // ADDED BY US // TODO VERIFY `WithMetadata`
	// } & WithMetadata<{ readonly [K in keyof M0]: M0[K] } & { readonly [K in keyof M1]: M1[K] }>;
	// } & WithMetadata<ToReadonlyObject<M0> & ToReadonlyObject<M1>>;
} & WithMetadata<ToReadonlyObject<M0 & M1>>;
// } & ({} extends M1 ? WithMetadata<ToReadonlyObject<M0>> : WithMetadata<ToReadonlyObject<M0 & M1>>);
// WithMetadata<ToReadonlyObject<M0> & (never extends M1 ? WithMetadata<ToReadonlyObject<M0>> : ToReadonlyObject<M1>)>; // ADDED BY US // TODO VERIFY `WithMetadata`

// TODO TRY separate `ToReadonlyObject`

export type Page<M0 extends RO, M1 extends RO> = EntityBase<M0, M1> & {
	title: string;
};

export type LinkedReferenceKind = "#" | "#[[]]" | "[[]]" | "::";

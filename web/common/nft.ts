/*
 * SPDX-License-Identifier: Apache-2.0
 */

type NFT  = {
    ID?: string
    URI?: string
    FileFormat?: string
    Owner?: string
    Organization?: string
    FileName?: string
    AssetName?: string
    Description?: string
    Weight?: number
    ApprovedForTransfer?: string | object
    RankerOrganizations?: string[]
    Date?:number
    price?: string
}

export type {NFT}

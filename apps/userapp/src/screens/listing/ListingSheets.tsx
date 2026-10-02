import React from 'react';
import type { Listing } from '../../lib/types';
import type { useListingPage } from './useListingPage';
import { PhoneSheets } from './PhoneSheets';
import { ReviewSheet } from './ReviewSheet';
import { ReportSheet } from './ReportSheet';
import { ShareSheet } from './ShareSheet';

/** Listing va Ijara sahifalarida ishlatiladigan barcha bottom sheet'lar. */
export const ListingSheets: React.FC<{ page: ReturnType<typeof useListingPage>; listing: Listing }> = ({ page, listing }) => (
  <>
    <PhoneSheets flow={page.phone} listing={listing} />
    <ReviewSheet open={page.sheet === 'review'} onClose={page.close} listing={listing} onDone={page.data.reload} />
    <ReportSheet open={page.sheet === 'report'} onClose={page.close} listing={listing} />
    <ShareSheet open={page.sheet === 'share'} onClose={page.close} listing={listing} />
  </>
);

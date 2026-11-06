package test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/usememos/memodo/store"
)

// TestMemoHomeTabFilters exercises the filter expressions used by the four
// home-page tabs (unscheduled / expired / planned / completed) against a real
// SQLite store, so the CEL → SQL rendering is verified end to end.
func TestMemoHomeTabFilters(t *testing.T) {
	ctx := context.Background()
	ts := NewTestService(t)
	defer ts.Cleanup()

	hostUser, err := ts.CreateHostUser(ctx, "host")
	require.NoError(t, err)

	now := time.Now().Unix()
	past := now - 3600
	future := now + 3600

	create := func(uid string, rowStatus store.RowStatus, planEnd *int64) {
		memo, err := ts.Store.CreateMemo(ctx, &store.Memo{
			UID:        uid,
			CreatorID:  hostUser.ID,
			Content:    "#" + uid + " " + uid,
			Visibility: store.Private,
			PlanEndTs:  planEnd,
		})
		require.NoError(t, err)
		// CreateMemo always inserts the default NORMAL state, so move the memo
		// into its target state through the regular update path.
		if rowStatus != store.Normal {
			err = ts.Store.UpdateMemo(ctx, &store.UpdateMemo{ID: memo.ID, RowStatus: &rowStatus})
			require.NoError(t, err)
		}
	}

	create("unscheduled", store.Normal, nil)
	create("expired", store.Normal, &past)
	create("planned", store.Normal, &future)
	create("completed", store.Completed, &past)
	create("archived", store.Archived, nil)

	listUIDs := func(filter string) []string {
		limit := 50
		memos, err := ts.Store.ListMemos(ctx, &store.FindMemo{
			// Mirrors the API default when no state parameter is supplied.
			RowStatusList: []store.RowStatus{store.Normal, store.Completed},
			Filters:       []string{filter},
			Limit:         &limit,
		})
		require.NoError(t, err, "filter %q", filter)
		uids := make([]string, 0, len(memos))
		for _, memo := range memos {
			uids = append(uids, memo.UID)
		}
		return uids
	}

	require.ElementsMatch(t, []string{"unscheduled"}, listUIDs(`state == "NORMAL" && has_plan == false`))
	require.ElementsMatch(t, []string{"expired"}, listUIDs(fmt.Sprintf(`state == "NORMAL" && plan_end_ts < %d`, now)))
	require.ElementsMatch(t, []string{"planned"}, listUIDs(fmt.Sprintf(`state == "NORMAL" && plan_end_ts >= %d`, now)))
	require.ElementsMatch(t, []string{"completed"}, listUIDs(`state == "COMPLETED"`))
}

// TestMemoHomeTabHasPlanComparison ensures the derived boolean works in both
// directions (has_plan == true keeps planned memos, == false drops them).
func TestMemoHomeTabHasPlanComparison(t *testing.T) {
	ctx := context.Background()
	ts := NewTestService(t)
	defer ts.Cleanup()

	hostUser, err := ts.CreateHostUser(ctx, "host")
	require.NoError(t, err)

	now := time.Now().Unix()
	create := func(uid string, planEnd *int64) {
		_, err := ts.Store.CreateMemo(ctx, &store.Memo{
			UID:        uid,
			CreatorID:  hostUser.ID,
			Content:    "#" + uid + " " + uid,
			Visibility: store.Private,
			RowStatus:  store.Normal,
			PlanEndTs:  planEnd,
		})
		require.NoError(t, err)
	}

	create("without-plan", nil)
	create("with-plan", &now)

	listUIDs := func(filter string) []string {
		limit := 50
		memos, err := ts.Store.ListMemos(ctx, &store.FindMemo{
			RowStatusList: []store.RowStatus{store.Normal, store.Completed},
			Filters:       []string{filter},
			Limit:         &limit,
		})
		require.NoError(t, err, "filter %q", filter)
		uids := make([]string, 0, len(memos))
		for _, memo := range memos {
			uids = append(uids, memo.UID)
		}
		return uids
	}

	require.ElementsMatch(t, []string{"with-plan"}, listUIDs("has_plan"))
	require.ElementsMatch(t, []string{"without-plan"}, listUIDs("has_plan == false"))
	require.ElementsMatch(t, []string{"with-plan"}, listUIDs("has_plan == true"))
}

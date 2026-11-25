package v1

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	v1pb "github.com/usememos/memodo/proto/gen/api/v1"
	"github.com/usememos/memodo/store"
)

// validateMemoStateLocks enforces the state-based write locks of a memo.
//
// A memo's state defines what may still change:
//
//   - NORMAL: everything is editable.
//   - COMPLETED: the timeline is frozen. Plan times and create_time can no longer
//     change, but the body may still be edited (e.g. to append the outcome).
//   - ARCHIVED: a frozen snapshot. Only restoring it to NORMAL or changing its
//     visibility is allowed; the body and its timeline are locked.
//
// The web client mirrors these rules for a good user experience, but they are
// enforced here as well so that direct API and MCP calls cannot bypass them.
func validateMemoStateLocks(current store.RowStatus, paths []string, requestedState v1pb.State) error {
	switch current {
	case store.Archived:
		return validateArchivedMemoUpdate(paths, requestedState)
	case store.Completed:
		return validateCompletedMemoUpdate(paths)
	default:
		return nil
	}
}

// validateArchivedMemoUpdate rejects everything but a restore or a visibility
// change on an archived memo.
func validateArchivedMemoUpdate(paths []string, requestedState v1pb.State) error {
	for _, path := range paths {
		switch path {
		case "state":
			// Restoring is the only state transition an archived memo accepts:
			// a completed memo has to be un-completed before it is archived,
			// never the other way around.
			if convertStateToStore(requestedState) != store.Normal {
				return status.Errorf(codes.FailedPrecondition, "archived memos must be restored before their state can be changed")
			}
		case "visibility":
			// Visibility is not part of the archived snapshot and stays editable.
		default:
			return status.Errorf(codes.FailedPrecondition, "archived memos are read-only; restore the memo to change %q", path)
		}
	}
	return nil
}

// validateCompletedMemoUpdate rejects timeline changes on a completed memo.
func validateCompletedMemoUpdate(paths []string) error {
	for _, path := range paths {
		switch path {
		case "plan_start_time", "plan_end_time", "create_time":
			return status.Errorf(codes.FailedPrecondition, "completed memos cannot change %q; uncomplete the memo first", path)
		}
	}
	return nil
}

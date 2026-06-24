package autoarchive

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/usememos/memodo/internal/webhook"
	v1pb "github.com/usememos/memodo/proto/gen/api/v1"
	storepb "github.com/usememos/memodo/proto/gen/store"
	"github.com/usememos/memodo/store"
)

// MemoArchivedCallback is called when a memo is auto-archived.
// Implementations should broadcast SSE events, etc.
type MemoArchivedCallback func(memoName string, visibility store.Visibility, creatorID int32)

// Runner periodically scans all users and auto-archives completed memos
// that have exceeded the user's configured archive_after_days threshold.
type Runner struct {
	Store          *store.Store
	OnMemoArchived MemoArchivedCallback
}

// NewRunner creates a new autoarchive runner.
func NewRunner(store *store.Store, onMemoArchived MemoArchivedCallback) *Runner {
	return &Runner{
		Store:          store,
		OnMemoArchived: onMemoArchived,
	}
}

const runnerInterval = 24 * time.Hour

// Run starts the autoarchive runner with a 24-hour ticker.
func (r *Runner) Run(ctx context.Context) {
	ticker := time.NewTicker(runnerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.RunOnce(ctx)
		case <-ctx.Done():
			return
		}
	}
}

// RunOnce performs a single auto-archive scan.
func (r *Runner) RunOnce(ctx context.Context) {
	slog.Info("AutoArchive runner: starting scan")
	start := time.Now()

	normal := store.Normal
	users, err := r.Store.ListUsers(ctx, &store.FindUser{
		RowStatus: &normal,
	})
	if err != nil {
		slog.Error("AutoArchive runner: failed to list users", "error", err)
		return
	}

	now := time.Now()
	totalArchived := 0

	for _, user := range users {
		select {
		case <-ctx.Done():
			slog.Info("AutoArchive runner: context cancelled, stopping scan")
			return
		default:
		}

		userID := user.ID

		// Check user's AUTO_ARCHIVE setting.
		userSetting, err := r.Store.GetUserSetting(ctx, &store.FindUserSetting{
			UserID: &userID,
			Key:    storepb.UserSetting_AUTO_ARCHIVE,
		})
		if err != nil {
			slog.Error("AutoArchive runner: failed to get user setting",
				"userID", userID,
				"error", err,
			)
			continue
		}

		autoArchive := userSetting.GetAutoArchive()
		if autoArchive == nil || !autoArchive.Enabled {
			continue
		}

		archiveAfterDays := autoArchive.ArchiveAfterDays
		if archiveAfterDays < 1 {
			archiveAfterDays = 15 // Default.
		}

		// Query COMPLETED memos for this user that are older than archive_after_days.
		cutoffTs := now.Add(-time.Duration(archiveAfterDays) * 24 * time.Hour).Unix()
		completed := store.Completed
		// Use CEL filter for updated_ts comparison (supported by all 3 DB drivers).
		cutoffFilter := fmt.Sprintf("updated_ts < %d", cutoffTs)

		limit := 500
		offset := 0
		userArchived := 0

		for {
			memos, err := r.Store.ListMemos(ctx, &store.FindMemo{
				CreatorID: &userID,
				RowStatus: &completed,
				Filters:   []string{cutoffFilter},
				Limit:     &limit,
				Offset:    &offset,
			})
			if err != nil {
				slog.Error("AutoArchive runner: failed to list memos",
					"userID", userID,
					"error", err,
				)
				break
			}

			if len(memos) == 0 {
				break
			}

			// Batch archive memos.
			for _, memo := range memos {
				archived := store.Archived
				updatedTs := now.Unix()
				if err := r.Store.UpdateMemo(ctx, &store.UpdateMemo{
					ID:        memo.ID,
					RowStatus: &archived,
					UpdatedTs: &updatedTs,
				}); err != nil {
					slog.Error("AutoArchive runner: failed to archive memo",
						"memoID", memo.ID,
						"userID", userID,
						"error", err,
					)
					continue
				}

				// Build memo resource name.
				memoName := fmt.Sprintf("memos/%s", memo.UID)

				// Notify via callback (e.g., SSE broadcast).
				if r.OnMemoArchived != nil {
					r.OnMemoArchived(memoName, memo.Visibility, memo.CreatorID)
				}

				// Dispatch webhook.
				r.dispatchMemoUpdatedWebhook(ctx, memo)

				userArchived++
			}

			offset += len(memos)
		}

		if userArchived > 0 {
			slog.Info("AutoArchive runner: archived memos for user",
				"userID", userID,
				"count", userArchived,
			)
			totalArchived += userArchived
		}
	}

	slog.Info("AutoArchive runner: scan complete",
		"totalArchived", totalArchived,
		"duration", time.Since(start),
	)
}

// dispatchMemoUpdatedWebhook dispatches a webhook for an archived memo.
func (r *Runner) dispatchMemoUpdatedWebhook(ctx context.Context, memo *store.Memo) {
	creator, err := r.Store.GetUser(ctx, &store.FindUser{ID: &memo.CreatorID})
	if err != nil || creator == nil {
		return
	}

	webhooks, err := r.Store.GetUserWebhooks(ctx, memo.CreatorID)
	if err != nil || len(webhooks) == 0 {
		return
	}

	creatorName := fmt.Sprintf("users/%s", creator.Username)
	memoName := fmt.Sprintf("memos/%s", memo.UID)

	for _, hook := range webhooks {
		webhook.PostAsync(&webhook.WebhookRequestPayload{
			URL:          hook.Url,
			ActivityType: "memos.memo.updated",
			Creator:      creatorName,
			Memo: &v1pb.Memo{
				Name:    memoName,
				Creator: creatorName,
			},
		})
	}
}

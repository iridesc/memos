package mcp

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
	"github.com/pkg/errors"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1pb "github.com/usememos/memodo/proto/gen/api/v1"
	"github.com/usememos/memodo/server/auth"
	"github.com/usememos/memodo/store"
)

// propertyJSON is the serialisable form of MemoPayload.Property.
type propertyJSON struct {
	HasLink            bool `json:"has_link"`
	HasTaskList        bool `json:"has_task_list"`
	HasCode            bool `json:"has_code"`
	HasIncompleteTasks bool `json:"has_incomplete_tasks"`
}

// memoJSON is the canonical response shape for all MCP memo results.
// It serialises correctly with standard encoding/json (no proto marshalling needed).
type memoJSON struct {
	Name       string        `json:"name"`
	Creator    string        `json:"creator"`
	CreateTime int64         `json:"create_time"`
	UpdateTime int64         `json:"update_time"`
	Content    string        `json:"content,omitempty"`
	Visibility string        `json:"visibility"`
	Tags       []string      `json:"tags"`
	Pinned     bool          `json:"pinned"`
	State      string        `json:"state"`
	Property   *propertyJSON `json:"property,omitempty"`
	Parent     string        `json:"parent,omitempty"`
	// PlanStartTime and PlanEndTime are Unix seconds; omitted when unset.
	PlanStartTime *int64 `json:"plan_start_time,omitempty"`
	PlanEndTime   *int64 `json:"plan_end_time,omitempty"`
	// TodayOrder is the fractional-indexed display order in the Today view.
	TodayOrder string `json:"today_order,omitempty"`
}

type memoListJSON struct {
	Memos   []memoJSON `json:"memos"`
	HasMore bool       `json:"has_more"`
}

func storeMemoToJSON(m *store.Memo) memoJSON {
	j := memoJSON{
		Name:       "memos/" + m.UID,
		CreateTime: m.CreatedTs,
		UpdateTime: m.UpdatedTs,
		Content:    m.Content,
		Visibility: string(m.Visibility),
		Pinned:     m.Pinned,
		State:      string(m.RowStatus),
		Tags:       []string{},
	}
	if m.Payload != nil {
		if len(m.Payload.Tags) > 0 {
			j.Tags = m.Payload.Tags
		}
		if p := m.Payload.Property; p != nil && (p.HasLink || p.HasTaskList || p.HasCode || p.HasIncompleteTasks) {
			j.Property = &propertyJSON{
				HasLink:            p.HasLink,
				HasTaskList:        p.HasTaskList,
				HasCode:            p.HasCode,
				HasIncompleteTasks: p.HasIncompleteTasks,
			}
		}
	}
	j.PlanStartTime = m.PlanStartTs
	j.PlanEndTime = m.PlanEndTs
	if m.TodayOrder != nil {
		j.TodayOrder = *m.TodayOrder
	}
	if m.ParentUID != nil {
		j.Parent = "memos/" + *m.ParentUID
	}
	return j
}

func lookupUsername(ctx context.Context, stores *store.Store, userID int32) (string, error) {
	user, err := stores.GetUser(ctx, &store.FindUser{ID: &userID})
	if err != nil {
		return "", errors.Wrapf(err, "failed to get creator user %d", userID)
	}
	if user == nil {
		return "", errors.Errorf("creator user %d not found", userID)
	}
	return "users/" + user.Username, nil
}

func preloadUsernames(ctx context.Context, stores *store.Store, userIDs []int32) (map[int32]string, error) {
	if len(userIDs) == 0 {
		return map[int32]string{}, nil
	}

	uniqueUserIDs := make([]int32, 0, len(userIDs))
	seenUserIDs := make(map[int32]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if _, seen := seenUserIDs[userID]; seen {
			continue
		}
		seenUserIDs[userID] = struct{}{}
		uniqueUserIDs = append(uniqueUserIDs, userID)
	}

	users, err := stores.ListUsers(ctx, &store.FindUser{IDList: uniqueUserIDs})
	if err != nil {
		return nil, errors.Wrap(err, "failed to list creator users")
	}

	usernamesByID := make(map[int32]string, len(users))
	for _, user := range users {
		usernamesByID[user.ID] = "users/" + user.Username
	}
	return usernamesByID, nil
}

func lookupUsernameFromCache(usernamesByID map[int32]string, userID int32) (string, error) {
	username, ok := usernamesByID[userID]
	if !ok {
		return "", errors.Errorf("creator user %d not found", userID)
	}
	return username, nil
}

func storeMemoToJSONWithStore(ctx context.Context, stores *store.Store, m *store.Memo) (memoJSON, error) {
	j := storeMemoToJSON(m)
	creator, err := lookupUsername(ctx, stores, m.CreatorID)
	if err != nil {
		return memoJSON{}, err
	}
	j.Creator = creator
	return j, nil
}

func storeMemoToJSONWithUsernames(m *store.Memo, usernamesByID map[int32]string) (memoJSON, error) {
	j := storeMemoToJSON(m)
	creator, err := lookupUsernameFromCache(usernamesByID, m.CreatorID)
	if err != nil {
		return memoJSON{}, err
	}
	j.Creator = creator
	return j, nil
}

// parseMemoUID extracts the UID from a "memos/<uid>" resource name.
func parseMemoUID(name string) (string, error) {
	uid, ok := strings.CutPrefix(name, "memos/")
	if !ok || uid == "" {
		return "", errors.Errorf(`memo name must be in the format "memos/<uid>", got %q`, name)
	}
	return uid, nil
}

// parseVisibility validates a visibility string and returns the store constant.
func parseVisibility(s string) (store.Visibility, error) {
	switch v := store.Visibility(s); v {
	case store.Public, store.Protected, store.Private:
		return v, nil
	default:
		return "", errors.Errorf("visibility must be PRIVATE, PROTECTED, or PUBLIC; got %q", s)
	}
}

// parseRowStatus validates a state string and returns the store constant.
func parseRowStatus(s string) (store.RowStatus, error) {
	switch rs := store.RowStatus(s); rs {
	case store.Normal, store.Archived, store.Completed:
		return rs, nil
	default:
		return "", errors.Errorf("state must be NORMAL, COMPLETED, or ARCHIVED; got %q", s)
	}
}

// planTimeArg is the parsed form of a plan_start_time / plan_end_time argument.
type planTimeArg struct {
	present bool
	isNull  bool
	value   int64
}

func getPlanTimeArg(req mcp.CallToolRequest, name string) planTimeArg {
	args := req.GetArguments()
	raw, ok := args[name]
	if !ok {
		return planTimeArg{}
	}
	if raw == nil {
		return planTimeArg{present: true, isNull: true}
	}
	switch v := raw.(type) {
	case float64:
		return planTimeArg{present: true, value: int64(v)}
	case int:
		return planTimeArg{present: true, value: int64(v)}
	case int64:
		return planTimeArg{present: true, value: v}
	case string:
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			return planTimeArg{present: true, value: parsed}
		}
	}
	return planTimeArg{}
}

type planTimesResult struct {
	provided bool
	clear    bool
	start    int64
	end      int64
}

// parsePlanTimes parses the optional plan_start_time / plan_end_time pair.
// The two values must be provided together. Explicit nulls for both mean
// "clear" (only meaningful when updating).
func parsePlanTimes(req mcp.CallToolRequest) (planTimesResult, error) {
	start := getPlanTimeArg(req, "plan_start_time")
	end := getPlanTimeArg(req, "plan_end_time")

	if !start.present && !end.present {
		return planTimesResult{}, nil
	}
	if start.present != end.present {
		return planTimesResult{}, errors.New("plan_start_time and plan_end_time must be provided together")
	}
	if start.isNull || end.isNull {
		if start.isNull && end.isNull {
			return planTimesResult{clear: true}, nil
		}
		return planTimesResult{}, errors.New("plan_start_time and plan_end_time must both be null to clear")
	}
	return planTimesResult{provided: true, start: start.value, end: end.value}, nil
}

// parseMemoOrderBy applies an AIP-132 style order_by string to the memo find.
// Supported fields: pinned, create_time, update_time, plan_start_time,
// plan_end_time, smart, today_order, name.
func parseMemoOrderBy(orderBy string, find *store.FindMemo) error {
	if strings.TrimSpace(orderBy) == "" {
		return errors.New("empty order_by")
	}

	fields := strings.Split(orderBy, ",")
	hasPinned := false
	hasExplicitTimeField := false

	for _, field := range fields {
		parts := strings.Fields(strings.TrimSpace(field))
		if len(parts) == 0 {
			continue
		}

		fieldName := parts[0]
		fieldDirection := "desc"
		if len(parts) > 1 {
			fieldDirection = strings.ToLower(parts[1])
			if fieldDirection != "asc" && fieldDirection != "desc" {
				return errors.Errorf("invalid order direction: %s, must be 'asc' or 'desc'", parts[1])
			}
		}

		switch fieldName {
		case "pinned":
			hasPinned = true
			find.OrderByPinned = true
		case "create_time", "name":
			if !hasExplicitTimeField {
				find.OrderByTimeAsc = fieldDirection == "asc"
			}
			hasExplicitTimeField = true
		case "update_time":
			if !hasExplicitTimeField {
				find.OrderByUpdatedTs = true
				find.OrderByTimeAsc = fieldDirection == "asc"
			}
			hasExplicitTimeField = true
		case "plan_start_time":
			if !hasExplicitTimeField {
				find.OrderByPlanStart = true
				find.OrderByTimeAsc = fieldDirection == "asc"
			}
			hasExplicitTimeField = true
		case "plan_end_time":
			if !hasExplicitTimeField {
				find.OrderByPlanEnd = true
				find.OrderByTimeAsc = fieldDirection == "asc"
			}
			hasExplicitTimeField = true
		case "smart":
			find.OrderBySmart = true
			find.SmartNowTs = time.Now().Unix()
			hasExplicitTimeField = true
		case "today_order":
			find.OrderByTodayOrder = true
			hasExplicitTimeField = true
		default:
			return errors.Errorf("unsupported order field: %s, supported fields are: pinned, create_time, update_time, plan_start_time, plan_end_time, smart, today_order, name", fieldName)
		}
	}

	if hasPinned && !find.OrderByUpdatedTs && len(fields) == 1 {
		find.OrderByTimeAsc = false
	}
	return nil
}

func extractUserID(ctx context.Context) (int32, error) {
	id := auth.GetUserID(ctx)
	if id == 0 {
		return 0, errors.New("unauthenticated: a personal access token is required")
	}
	return id, nil
}

func (s *MCPService) registerMemoTools(mcpSrv *mcpserver.MCPServer) {
	mcpSrv.AddTool(mcp.NewTool("list_memos",
		readOnlyToolOptions("List memos", "List memos visible to the caller. Authenticated users see their own memos plus public and protected memos; unauthenticated callers see only public memos.",
			mcp.WithNumber("page_size", mcp.Description("Maximum memos to return (1–100, default 20)")),
			mcp.WithNumber("page", mcp.Description("Zero-based page index for pagination (default 0)")),
			mcp.WithString("state",
				mcp.Enum("NORMAL", "COMPLETED", "ARCHIVED"),
				mcp.Description("Filter by state: NORMAL (default; also includes COMPLETED), COMPLETED, or ARCHIVED"),
			),
			mcp.WithBoolean("order_by_pinned", mcp.Description("Deprecated: prefer order_by. When true, pinned memos appear first (default false)")),
			mcp.WithString("order_by", mcp.Description(`Sort order following AIP-132, e.g. "plan_start_time asc" or "pinned desc, create_time desc". Supported fields: pinned, create_time, update_time, plan_start_time, plan_end_time, smart, today_order, name.`)),
			mcp.WithString("filter", mcp.Description(`Optional CEL filter (supported subset of standard CEL syntax), e.g. content.contains("keyword") or tags.exists(t, t == "work")`)),
			mcp.WithOutputSchema[memoListJSON](),
		)...,
	), s.handleListMemos)

	mcpSrv.AddTool(mcp.NewTool("get_memo",
		readOnlyToolOptions("Get memo", "Get a single memo by resource name. Public memos are accessible without authentication.",
			mcp.WithString("name", mcp.Required(), mcp.Description(`Memo resource name, e.g. "memos/abc123"`)),
			mcp.WithOutputSchema[memoJSON](),
		)...,
	), s.handleGetMemo)

	mcpSrv.AddTool(mcp.NewTool("create_memo",
		createToolOptions("Create memo", "Create a new memo. Requires authentication.", false,
			mcp.WithString("content", mcp.Required(), mcp.Description("Memo content in Markdown. Use #tag syntax for tagging.")),
			mcp.WithString("visibility",
				mcp.Enum("PRIVATE", "PROTECTED", "PUBLIC"),
				mcp.Description("Visibility (default: PRIVATE)"),
			),
			mcp.WithNumber("plan_start_time", mcp.Description("Planned start time as Unix seconds. Must be provided together with plan_end_time.")),
			mcp.WithNumber("plan_end_time", mcp.Description("Planned end time as Unix seconds. Must be provided together with plan_start_time.")),
			mcp.WithOutputSchema[memoJSON](),
		)...,
	), s.handleCreateMemo)

	mcpSrv.AddTool(mcp.NewTool("update_memo",
		updateToolOptions("Update memo", "Update a memo's content, visibility, pin state, plan times, today order, or state. Requires authentication and ownership. Omit any field to leave it unchanged.",
			mcp.WithString("name", mcp.Required(), mcp.Description(`Memo resource name, e.g. "memos/abc123"`)),
			mcp.WithString("content", mcp.Description("New Markdown content")),
			mcp.WithString("visibility",
				mcp.Enum("PRIVATE", "PROTECTED", "PUBLIC"),
				mcp.Description("New visibility"),
			),
			mcp.WithBoolean("pinned", mcp.Description("Pin or unpin the memo")),
			mcp.WithNumber("plan_start_time", mcp.Description("New planned start time as Unix seconds. Provide together with plan_end_time; pass null for both to clear.")),
			mcp.WithNumber("plan_end_time", mcp.Description("New planned end time as Unix seconds. Provide together with plan_start_time; pass null for both to clear.")),
			mcp.WithString("today_order", mcp.Description("Fractional-indexed display order in the Today view. Omit to leave unchanged; empty string clears the order.")),
			mcp.WithString("state",
				mcp.Enum("NORMAL", "COMPLETED", "ARCHIVED"),
				mcp.Description("Set the memo state: NORMAL, COMPLETED, or ARCHIVED"),
			),
			mcp.WithOutputSchema[memoJSON](),
		)...,
	), s.handleUpdateMemo)

	mcpSrv.AddTool(mcp.NewTool("delete_memo",
		updateToolOptions("Delete memo", "Permanently delete a memo. Requires authentication and ownership.",
			mcp.WithString("name", mcp.Required(), mcp.Description(`Memo resource name, e.g. "memos/abc123"`)),
			mcp.WithOutputSchema[deletedJSON](),
		)...,
	), s.handleDeleteMemo)

	mcpSrv.AddTool(mcp.NewTool("search_memos",
		readOnlyToolOptions("Search memos", "Search memo content. Authenticated users search their own and visible memos; unauthenticated callers search public memos only.",
			mcp.WithString("query", mcp.Required(), mcp.Description("Text to search for in memo content")),
		)...,
	), s.handleSearchMemos)

	mcpSrv.AddTool(mcp.NewTool("list_memo_comments",
		readOnlyToolOptions("List memo comments", "List comments on a memo. Visibility rules for comments match those of the parent memo.",
			mcp.WithString("name", mcp.Required(), mcp.Description(`Memo resource name, e.g. "memos/abc123"`)),
		)...,
	), s.handleListMemoComments)

	mcpSrv.AddTool(mcp.NewTool("create_memo_comment",
		createToolOptions("Create memo comment", "Add a comment to a memo. The comment inherits the parent memo's visibility. Requires authentication.", false,
			mcp.WithString("name", mcp.Required(), mcp.Description(`Memo resource name to comment on, e.g. "memos/abc123"`)),
			mcp.WithString("content", mcp.Required(), mcp.Description("Comment content in Markdown")),
			mcp.WithOutputSchema[memoJSON](),
		)...,
	), s.handleCreateMemoComment)
}

func (s *MCPService) handleListMemos(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := auth.GetUserID(ctx)

	pageSize := req.GetInt("page_size", 20)
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	page := req.GetInt("page", 0)
	if page < 0 {
		page = 0
	}

	state, err := parseRowStatus(req.GetString("state", "NORMAL"))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	limit := pageSize + 1
	offset := page * pageSize
	find := &store.FindMemo{
		ExcludeComments: true,
		Limit:           &limit,
		Offset:          &offset,
	}
	switch state {
	case store.Archived:
		find.RowStatus = &state
	case store.Completed:
		find.RowStatusList = []store.RowStatus{store.Completed}
	default:
		find.RowStatusList = []store.RowStatus{store.Normal, store.Completed}
	}
	applyVisibilityFilter(find, userID, state)
	if orderBy := req.GetString("order_by", ""); orderBy != "" {
		if err := parseMemoOrderBy(orderBy, find); err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
	} else if req.GetBool("order_by_pinned", false) {
		find.OrderByPinned = true
	}
	if filter := req.GetString("filter", ""); filter != "" {
		find.Filters = append(find.Filters, filter)
	}

	memos, err := s.store.ListMemos(ctx, find)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to list memos: %v", err)), nil
	}

	hasMore := len(memos) > pageSize
	if hasMore {
		memos = memos[:pageSize]
	}
	creatorIDs := make([]int32, 0, len(memos))
	for _, memo := range memos {
		creatorIDs = append(creatorIDs, memo.CreatorID)
	}
	usernamesByID, err := preloadUsernames(ctx, s.store, creatorIDs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to preload memo creators: %v", err)), nil
	}

	results := make([]memoJSON, len(memos))
	for i, m := range memos {
		result, err := storeMemoToJSONWithUsernames(m, usernamesByID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to resolve memo creator: %v", err)), nil
		}
		results[i] = result
	}

	return newToolResultJSON(memoListJSON{Memos: results, HasMore: hasMore})
}

func (s *MCPService) handleGetMemo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := auth.GetUserID(ctx)

	uid, err := parseMemoUID(req.GetString("name", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	memo, err := s.store.GetMemo(ctx, &store.FindMemo{UID: &uid})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to get memo: %v", err)), nil
	}
	if memo == nil {
		return mcp.NewToolResultError("memo not found"), nil
	}
	if err := checkMemoAccess(memo, userID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	result, err := storeMemoToJSONWithStore(ctx, s.store, memo)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to resolve memo creator: %v", err)), nil
	}
	return newToolResultJSON(result)
}

func (s *MCPService) handleCreateMemo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if _, err := extractUserID(ctx); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	content := req.GetString("content", "")
	if content == "" {
		return mcp.NewToolResultError("content is required"), nil
	}
	visibility, err := parseVisibility(req.GetString("visibility", "PRIVATE"))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	memo := &v1pb.Memo{
		Content:    content,
		Visibility: visibilityToProto(visibility),
	}
	planTimes, err := parsePlanTimes(req)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if planTimes.clear {
		return mcp.NewToolResultError("plan_start_time and plan_end_time cannot be cleared on create"), nil
	}
	if planTimes.provided {
		memo.PlanStartTime = timestamppb.New(time.Unix(planTimes.start, 0))
		memo.PlanEndTime = timestamppb.New(time.Unix(planTimes.end, 0))
	}

	created, err := s.apiV1Service.CreateMemo(ctx, &v1pb.CreateMemoRequest{Memo: memo})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to create memo: %v", err)), nil
	}

	result, err := s.loadMemoJSONByName(ctx, created.Name)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return newToolResultJSON(result)
}

func (s *MCPService) handleUpdateMemo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if _, err := extractUserID(ctx); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	uid, err := parseMemoUID(req.GetString("name", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	update := &v1pb.Memo{Name: "memos/" + uid}
	updateMask := &fieldmaskpb.FieldMask{}
	args := req.GetArguments()

	if v := req.GetString("content", ""); v != "" {
		update.Content = v
		updateMask.Paths = append(updateMask.Paths, "content")
	}
	if v := req.GetString("visibility", ""); v != "" {
		vis, err := parseVisibility(v)
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		update.Visibility = visibilityToProto(vis)
		updateMask.Paths = append(updateMask.Paths, "visibility")
	}
	if v := req.GetString("state", ""); v != "" {
		rs, err := parseRowStatus(v)
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		update.State = rowStatusToProto(rs)
		updateMask.Paths = append(updateMask.Paths, "state")
	}
	if _, ok := args["pinned"]; ok {
		update.Pinned = req.GetBool("pinned", false)
		updateMask.Paths = append(updateMask.Paths, "pinned")
	}
	planTimes, err := parsePlanTimes(req)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if planTimes.provided {
		update.PlanStartTime = timestamppb.New(time.Unix(planTimes.start, 0))
		update.PlanEndTime = timestamppb.New(time.Unix(planTimes.end, 0))
		updateMask.Paths = append(updateMask.Paths, "plan_start_time", "plan_end_time")
	} else if planTimes.clear {
		// Leave the timestamps nil: the API maps nil + mask path to "clear".
		updateMask.Paths = append(updateMask.Paths, "plan_start_time", "plan_end_time")
	}
	if v, ok := args["today_order"]; ok {
		if order, ok := v.(string); ok {
			update.TodayOrder = order
			updateMask.Paths = append(updateMask.Paths, "today_order")
		}
	}

	if len(updateMask.Paths) == 0 {
		return mcp.NewToolResultError("at least one field must be provided to update"), nil
	}

	updated, err := s.apiV1Service.UpdateMemo(ctx, &v1pb.UpdateMemoRequest{
		Memo:       update,
		UpdateMask: updateMask,
	})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to update memo: %v", err)), nil
	}

	result, err := s.loadMemoJSONByName(ctx, updated.Name)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return newToolResultJSON(result)
}

func (s *MCPService) handleDeleteMemo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if _, err := extractUserID(ctx); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	uid, err := parseMemoUID(req.GetString("name", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	if _, err := s.apiV1Service.DeleteMemo(ctx, &v1pb.DeleteMemoRequest{Name: "memos/" + uid}); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to delete memo: %v", err)), nil
	}
	return newDeletedToolResult()
}

func (s *MCPService) handleSearchMemos(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := auth.GetUserID(ctx)

	query := req.GetString("query", "")
	if query == "" {
		return mcp.NewToolResultError("query is required"), nil
	}

	limit := 50
	zero := 0
	find := &store.FindMemo{
		ExcludeComments: true,
		RowStatusList:   []store.RowStatus{store.Normal, store.Completed},
		Limit:           &limit,
		Offset:          &zero,
		Filters:         []string{fmt.Sprintf(`content.contains(%q)`, query)},
	}
	applyVisibilityFilter(find, userID, store.Normal)

	memos, err := s.store.ListMemos(ctx, find)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to search memos: %v", err)), nil
	}
	creatorIDs := make([]int32, 0, len(memos))
	for _, memo := range memos {
		creatorIDs = append(creatorIDs, memo.CreatorID)
	}
	usernamesByID, err := preloadUsernames(ctx, s.store, creatorIDs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to preload memo creators: %v", err)), nil
	}

	results := make([]memoJSON, len(memos))
	for i, m := range memos {
		result, err := storeMemoToJSONWithUsernames(m, usernamesByID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to resolve memo creator: %v", err)), nil
		}
		results[i] = result
	}
	return newToolResultJSONList("memos", results)
}

func (s *MCPService) handleListMemoComments(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID := auth.GetUserID(ctx)

	uid, err := parseMemoUID(req.GetString("name", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	parent, err := s.store.GetMemo(ctx, &store.FindMemo{UID: &uid})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to get memo: %v", err)), nil
	}
	if parent == nil {
		return mcp.NewToolResultError("memo not found"), nil
	}
	if err := checkMemoAccess(parent, userID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	relationType := store.MemoRelationComment
	relations, err := s.store.ListMemoRelations(ctx, &store.FindMemoRelation{
		RelatedMemoID: &parent.ID,
		Type:          &relationType,
	})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to list relations: %v", err)), nil
	}
	if len(relations) == 0 {
		return newToolResultJSONList("memos", []memoJSON{})
	}

	commentIDs := make([]int32, len(relations))
	for i, r := range relations {
		commentIDs[i] = r.MemoID
	}

	memos, err := s.store.ListMemos(ctx, &store.FindMemo{IDList: commentIDs})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to list comments: %v", err)), nil
	}
	creatorIDs := make([]int32, 0, len(memos))
	for _, memo := range memos {
		if checkMemoAccess(memo, userID) == nil {
			creatorIDs = append(creatorIDs, memo.CreatorID)
		}
	}
	usernamesByID, err := preloadUsernames(ctx, s.store, creatorIDs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to preload memo creators: %v", err)), nil
	}

	results := make([]memoJSON, 0, len(memos))
	for _, m := range memos {
		if checkMemoAccess(m, userID) == nil {
			result, err := storeMemoToJSONWithUsernames(m, usernamesByID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("failed to resolve memo creator: %v", err)), nil
			}
			results = append(results, result)
		}
	}
	return newToolResultJSONList("memos", results)
}

func (s *MCPService) handleCreateMemoComment(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	uid, err := parseMemoUID(req.GetString("name", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	content := req.GetString("content", "")
	if content == "" {
		return mcp.NewToolResultError("content is required"), nil
	}

	parent, err := s.store.GetMemo(ctx, &store.FindMemo{UID: &uid})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to get memo: %v", err)), nil
	}
	if parent == nil {
		return mcp.NewToolResultError("memo not found"), nil
	}
	if err := checkMemoAccess(parent, userID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	comment, err := s.apiV1Service.CreateMemoComment(ctx, &v1pb.CreateMemoCommentRequest{
		Name: "memos/" + uid,
		Comment: &v1pb.Memo{
			Content:    content,
			Visibility: visibilityToProto(parent.Visibility),
		},
	})
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to create comment: %v", err)), nil
	}

	result, err := s.loadMemoJSONByName(ctx, comment.Name)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return newToolResultJSON(result)
}

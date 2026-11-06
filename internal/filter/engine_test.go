package filter

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCompileAcceptsStandardTagEqualityPredicate(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `tags.exists(t, t == "1231")`)
	require.NoError(t, err)
}

func TestCompileRejectsLegacyNumericLogicalOperand(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `pinned && 1`)
	require.Error(t, err)
	require.Contains(t, err.Error(), "failed to compile filter")
}

func TestCompileRejectsNonBooleanTopLevelConstant(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	_, err = engine.Compile(context.Background(), `1`)
	require.EqualError(t, err, "filter must evaluate to a boolean value")
}

func TestCompileStateFilter(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	stmt, err := engine.CompileToStatement(context.Background(), `state == "NORMAL"`, RenderOptions{Dialect: DialectSQLite})
	require.NoError(t, err)
	require.Contains(t, stmt.SQL, "`memo`.`row_status` = ?")
	require.Equal(t, []any{"NORMAL"}, stmt.Args)
}

func TestCompileHasPlanPredicate(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	for _, dialect := range []DialectName{DialectSQLite, DialectMySQL, DialectPostgres} {
		stmt, err := engine.CompileToStatement(context.Background(), `has_plan`, RenderOptions{Dialect: dialect})
		require.NoError(t, err)
		require.Contains(t, stmt.SQL, "IS NOT NULL)")
	}
}

func TestCompileHasPlanComparison(t *testing.T) {
	t.Parallel()

	engine, err := NewEngine(NewSchema())
	require.NoError(t, err)

	stmt, err := engine.CompileToStatement(context.Background(), `has_plan == false`, RenderOptions{Dialect: DialectPostgres})
	require.NoError(t, err)
	require.Contains(t, stmt.SQL, "NOT (memo.plan_end_ts IS NOT NULL)")

	stmt, err = engine.CompileToStatement(context.Background(), `has_plan != true`, RenderOptions{Dialect: DialectPostgres})
	require.NoError(t, err)
	require.Contains(t, stmt.SQL, "NOT (memo.plan_end_ts IS NOT NULL)")

	stmt, err = engine.CompileToStatement(context.Background(), `has_plan == true`, RenderOptions{Dialect: DialectPostgres})
	require.NoError(t, err)
	require.NotContains(t, stmt.SQL, "NOT (")
}

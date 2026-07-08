package fractionalindexing
import "strings"

const (
	base       = 62
	baseDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)

var digitToVal [128]int8

func init() {
	for i := range digitToVal {
		digitToVal[i] = -1
	}
	for i, c := range baseDigits {
		digitToVal[c] = int8(i)
	}
}

// Midpoint returns a string key that sorts between a and b lexicographically.
// a or b may be empty: if a is empty, generates a key before b;
// if b is empty, generates a key after a.
func Midpoint(a, b string, digits int) string {
	if a == "" {
		prefix := strings.Repeat(string(baseDigits[0]), digits)
		if b == "" {
			return prefix
		}
		a = prefix
	}
	if b == "" {
		b = strings.Repeat(string(baseDigits[base-1]), len(a))
	}
	if a >= b {
		a, b = b, a
	}

	var res strings.Builder
	i := 0

	for {
		da := charAtOr(a, i, base-1)
		db := charAtOr(b, i, 0)

		if da == db {
			res.WriteByte(baseDigits[da])
			i++
			continue
		}

		if i == len(a) && i == len(b) {
			mid := (da + db) / 2
			if mid == da {
				res.WriteByte(baseDigits[da])
				res.WriteByte(baseDigits[(0+db)/2])
			} else {
				res.WriteByte(baseDigits[mid])
			}
			break
		}

		if i == len(a) {
			if da+1 < db {
				mid := (da + db) / 2
				res.WriteByte(baseDigits[mid])
			} else {
				res.WriteByte(baseDigits[da])
				if 0 < db {
					mid := (0 + db) / 2
					res.WriteByte(baseDigits[mid])
				} else {
					res.WriteByte(baseDigits[0])
					res.WriteByte(baseDigits[0])
				}
			}
			break
		}

		if i == len(b) {
			mid := (da + db) / 2
			if mid == db {
				res.WriteByte(baseDigits[da])
				res.WriteByte(baseDigits[base-1])
			} else {
				res.WriteByte(baseDigits[mid])
			}
			break
		}

		diff := db - da
		if diff > 1 {
			mid := da + diff/2
			res.WriteByte(baseDigits[mid])
			break
		}

		res.WriteByte(baseDigits[da])
		i++
	}

	return res.String()
}

func charAtOr(s string, i int, defaultVal int) int {
	if i < len(s) {
		c := s[i]
		if c < 128 && digitToVal[c] >= 0 {
			return int(digitToVal[c])
		}
	}
	return defaultVal
}

// GenerateNKeysBetween generates n equally-spaced keys between a and b.
func GenerateNKeysBetween(a, b string, n int, digits int) []string {
	if n <= 0 {
		return nil
	}
	keys := make([]string, 0, n)
	for i := 1; i <= n; i++ {
		key := Midpoint(a, b, digits)
		if key == "" {
			continue
		}
		keys = append(keys, key)
		if i < n {
			a = key
		}
	}
	return keys
}

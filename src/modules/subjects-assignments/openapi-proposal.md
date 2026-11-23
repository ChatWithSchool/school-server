# I06 subjects API contract proposal

This proposal is for review by the team leads. It does not modify `openapi/openapi.yaml`.

## GET /subjects

Add these optional query parameters:

| Name | Type | Meaning |
| --- | --- | --- |
| `q` | string | Case-insensitive search in subject name or code |
| `grade` | string | Return subjects whose `grades` contains this value |
| `page` | integer, default `1`, minimum `1` | Page number |
| `size` | integer, default `25`, minimum `1`, maximum `100` | Page size |

The response remains `SubjectPage`.

## POST /subjects

Make the JSON request body required and reference `SubjectInput`:

```yaml
SubjectInput:
  type: object
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 80
    code:
      type: string
      minLength: 2
      maxLength: 12
      description: Unique within the institution; stored uppercase
    grades:
      type: array
      items:
        type: string
  required:
    - name
    - code
```

When `grades` is omitted, the server stores an empty array.

## Open question: duplicate code response

The implementation currently returns `400 VALIDATION_ERROR` with a `code` detail for a duplicate code, as agreed for this interim change. Should the contract keep this response, or add a `409` response for the uniqueness conflict?

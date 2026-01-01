# Test Users Created

## Created Users for Binary Tree Testing

### User A (LEFT Placement)
- **Email:** usera@test.com
- **Password:** password123
- **Sponsor ID:** JGwVU6DbLYX8RBa828FiVFxCGv93
- **Placement Side:** LEFT
- **Company ID:** lbKqNZmGGYyCn7q0PHZj
- **Status:** active

### User B (RIGHT Placement)
- **Email:** userb@test.com
- **Password:** password123
- **Sponsor ID:** JGwVU6DbLYX8RBa828FiVFxCGv93
- **Placement Side:** RIGHT
- **Company ID:** lbKqNZmGGYyCn7q0PHZj
- **Status:** active

## Sponsor User
- **Email:** sponsor@test.com
- **Password:** password123
- **User ID:** JGwVU6DbLYX8RBa828FiVFxCGv93

## Next Steps

1. Login as sponsor user (sponsor@test.com)
2. Navigate to `/user?tab=team`
3. Verify:
   - User A appears on LEFT leg
   - User B appears on RIGHT leg
   - Team count = 2
   - Left Leg Members = 1
   - Right Leg Members = 1

## Binary Tree Structure Expected:

```
        Sponsor User
       /            \
   User A (LEFT)  User B (RIGHT)
```

## Cloud Function Triggers

When users are created, the Cloud Function `onUserCreate` should:
1. Initialize wallet
2. Initialize binary tree position
3. Update sponsor's binary tree
4. Set custom claims

## Verification Checklist

- [ ] User A document created in Firestore
- [ ] User B document created in Firestore
- [ ] Both users have sponsorId = JGwVU6DbLYX8RBa828FiVFxCGv93
- [ ] User A has placementSide = 'left'
- [ ] User B has placementSide = 'right'
- [ ] Sponsor's binary tree updated
- [ ] Team count shows 2 members
- [ ] Binary tree visualization shows both users


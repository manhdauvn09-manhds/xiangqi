#!/bin/bash
# Monitor audit.log for security events
# Run daily via cron: 0 9 * * * /path/to/monitor-audit.sh

LOG_FILE="/app/data/audit.log"
ALERT_FILE="/tmp/audit-alerts.txt"
YESTERDAY=$(date -d "yesterday" '+%Y-%m-%d')

echo "=== Audit Log Summary (Yesterday) ===" > $ALERT_FILE
echo "Date: $(date)" >> $ALERT_FILE
echo "" >> $ALERT_FILE

# Count by event type
echo "Event counts:" >> $ALERT_FILE
grep "$YESTERDAY" $LOG_FILE | awk '{print $5}' | sort | uniq -c | sort -rn >> $ALERT_FILE

# Failed auth attempts
echo "" >> $ALERT_FILE
echo "Failed auth attempts:" >> $ALERT_FILE
grep "$YESTERDAY.*FAILED" $LOG_FILE | wc -l >> $ALERT_FILE

# Security events
echo "" >> $ALERT_FILE
echo "Security events:" >> $ALERT_FILE
grep "$YESTERDAY.*SECURITY" $LOG_FILE >> $ALERT_FILE

# Rate limit hits
echo "" >> $ALERT_FILE
echo "Rate limit events:" >> $ALERT_FILE
grep "$YESTERDAY.*rate_limit" $LOG_FILE | wc -l >> $ALERT_FILE

# Send alert if issues found
ISSUES=$(grep -c "FAILED\|SECURITY\|rate_limit" $ALERT_FILE || echo "0")
if [ "$ISSUES" -gt 0 ]; then
  echo "⚠️  Security events detected!"
  cat $ALERT_FILE
  # Optional: Send email
  # mail -s "Security Alert - Xiangqi" admin@example.com < $ALERT_FILE
fi

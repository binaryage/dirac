# this awk script tries to filter out unwanted lines from browser tests output
# the problem are travis ANSI escape sequences which might be present
# naive removal of matched lines could remove some travis commands because
# they are technically separated by \r and part of the same line
#
# solution: we want to split lines on \r\033[0K and filter out only
#           real line content without affecting travis control commands

BEGIN {
  RS="\n";
  FS="\r\033.0K";
}

{ silenced = 0 }

/org.openqa.selenium.remote.ProtocolHandshake|assuming Postel|INFO: Detected dialect/ {
  for (i = 1; i <= NF-1; i++) printf "%s\r\033[0K", $i;
  silenced=1;
}

{ if (!silenced) print $0; }

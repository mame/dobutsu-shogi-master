require "xmlrpc/client"

neos = XMLRPC::Client.new2("https://neos-server.org:3333", nil, 3600)

if neos.call("ping") != "NeosServer is alive\n"
  puts "server down"
  exit
end

CPLEX = <<END
<document>
<category>lp</category>
<solver>CPLEX</solver>
<inputType>LP</inputType>
<client></client>
<priority>long</priority>
<email>EMAIL</email>
<LP><![CDATA[LPDATA]]></LP>
<options><![CDATA[set timelimit TIMELIMIT
set workmem 128
set mip strategy file 2
set mip limits treememory 16384
]]></options>
<post><![CDATA[display solution variable -
]]></post>
<comments><![CDATA[]]></comments>
</document>
END

SCIP = <<END
<document>
<category>go</category>
<solver>scip</solver>
<inputType>CPLEX</inputType>
<mps><![CDATA[]]></mps>
<lp><![CDATA[LPDATA]]></lp>
<zpl><![CDATA[]]></zpl>
<osil><![CDATA[]]></osil>
<par><![CDATA[limits/time = TIMELIMIT
limits/memory = 4096
]]></par>
<comments><![CDATA[]]></comments>
</document>
END

def job_passwd
  job, passwd = ARGV[1].split(":")
  [job.to_i, passwd]
end

case ARGV[0]
when "--list"
  puts neos.call("printQueue")
when "--submit-cplex", "--submit-scip"
  raise "no email" unless ENV["EMAIL"]
  raise "no time limit" unless ENV["TIMELIMIT"]
  xml = ARGV[0] == "--submit-cplex" ? CPLEX : SCIP
  xml.gsub!("EMAIL") { ENV["EMAIL"] }
  xml.gsub!("TIMELIMIT") { ENV["TIMELIMIT"] }
  xml.gsub!("LPDATA") { File.read(ARGV[1]) }
  puts neos.call("submitJob", xml, ENV["EMAIL"]) * ":"
when "--show"
  puts s = neos.call("getJobStatus", *job_passwd)
  puts neos.call("getFinalResults", *job_passwd) if s.chomp == "Done"
else
  raise
end

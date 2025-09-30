import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WATCHLIST_TABLE_HEADER } from "@/lib/constants";

const WatchlistTable = () => {
  const sampleData = [
    {
      company: "Apple Inc.",
      symbol: "AAPL",
      price: "$175.43",
      change: "+2.45 (1.42%)",
      marketCap: "$2.8T",
      peRatio: "28.5",
      alert: "Set Alert",
      action: "Remove",
    },
    {
      company: "Microsoft Corporation",
      symbol: "MSFT",
      price: "$338.11",
      change: "-1.23 (0.36%)",
      marketCap: "$2.5T",
      peRatio: "32.1",
      alert: "Set Alert",
      action: "Remove",
    },
    {
      company: "NVIDIA Corporation",
      symbol: "NVDA",
      price: "$436.58",
      change: "+15.67 (3.72%)",
      marketCap: "$1.1T",
      peRatio: "65.3",
      alert: "Set Alert",
      action: "Remove",
    },
    {
      company: "Amazon.com Inc.",
      symbol: "AMZN",
      price: "$143.31",
      change: "+0.89 (0.63%)",
      marketCap: "$1.5T",
      peRatio: "47.8",
      alert: "Set Alert",
      action: "Remove",
    },
    {
      company: "Tesla Inc.",
      symbol: "TSLA",
      price: "$248.50",
      change: "-3.25 (1.29%)",
      marketCap: "$790B",
      peRatio: "62.4",
      alert: "Set Alert",
      action: "Remove",
    },
  ];

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            {WATCHLIST_TABLE_HEADER.map((header) => (
              <TableHead key={header} className="text-left">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.map((stock, index) => (
            <TableRow key={index}>
              <TableCell className="text-left">{stock.company}</TableCell>
              <TableCell className="text-left">{stock.symbol}</TableCell>
              <TableCell className="text-left">{stock.price}</TableCell>
              <TableCell className="text-left">{stock.change}</TableCell>
              <TableCell className="text-left">{stock.marketCap}</TableCell>
              <TableCell className="text-left">{stock.peRatio}</TableCell>
              <TableCell className="text-left">{stock.alert}</TableCell>
              <TableCell className="text-left">{stock.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WatchlistTable;
